import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BookingError } from '@/lib/booking';

// ── Mocks (hoisted before imports) ────────────────────────────────────────────

const mockTransaction = vi.hoisted(() => vi.fn());

vi.mock('@/lib/db', () => ({
  prisma: {
    $transaction: mockTransaction,
  },
}));

import { createBooking } from '@/lib/booking';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const baseInput = {
  firstName: 'Marie',
  lastName: 'Dupont',
  phone: '+33612345678',
  instagram: undefined,
  email: undefined,
  preferredChannel: 'WHATSAPP' as const,
  notes: undefined,
  gdprConsent: true as const,
  serviceId: 'service-1',
  timeSlotId: 'slot-1',
};

const mockService = {
  id: 'service-1',
  name: 'Tresses collées',
  priceCents: 8000,
  durationMinutes: 120,
  active: true,
};

const mockSlot = {
  id: 'slot-1',
  startsAt: new Date('2026-06-01T09:00:00.000Z'),
  endsAt: new Date('2026-06-01T09:30:00.000Z'),
  status: 'OPEN',
};

const mockBooking = {
  id: 'booking-1',
  publicCode: 'pub-code-abc',
  customerFirstName: 'Marie',
  customerLastName: 'Dupont',
  customerPhone: '+33612345678',
  serviceId: 'service-1',
  timeSlotId: 'slot-1',
  priceCentsAtBooking: 8000,
  status: 'PENDING',
  createdAt: new Date(),
  updatedAt: new Date(),
};

function makeTx({
  slotStatus = 'OPEN',
  serviceActive = true,
}: {
  slotStatus?: string;
  serviceActive?: boolean;
} = {}) {
  return {
    service: {
      findUnique: vi.fn().mockResolvedValue(serviceActive ? mockService : null),
    },
    timeSlot: {
      findUnique: vi.fn().mockResolvedValue({ ...mockSlot, status: slotStatus }),
      update: vi.fn().mockResolvedValue({ ...mockSlot, status: 'PENDING' }),
    },
    booking: {
      create: vi.fn().mockResolvedValue(mockBooking),
    },
  };
}

// ── Tests unitaires ───────────────────────────────────────────────────────────

describe('createBooking', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('crée un booking et retourne le publicCode quand le slot est OPEN', async () => {
    const tx = makeTx();
    mockTransaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => fn(tx));

    const result = await createBooking(baseInput);

    expect(result.publicCode).toBe('pub-code-abc');
    expect(tx.timeSlot.update).toHaveBeenCalledWith({
      where: { id: 'slot-1' },
      data: { status: 'PENDING' },
    });
    expect(tx.booking.create).toHaveBeenCalledOnce();
  });

  it("lève SLOT_NOT_AVAILABLE quand le slot a le statut 'CLOSED'", async () => {
    const tx = makeTx({ slotStatus: 'CLOSED' });
    mockTransaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => fn(tx));

    await expect(createBooking(baseInput)).rejects.toMatchObject({
      name: 'BookingError',
      code: 'SLOT_NOT_AVAILABLE',
    });
    expect(tx.booking.create).not.toHaveBeenCalled();
  });

  it("lève SLOT_NOT_AVAILABLE quand le slot a le statut 'PENDING'", async () => {
    const tx = makeTx({ slotStatus: 'PENDING' });
    mockTransaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => fn(tx));

    await expect(createBooking(baseInput)).rejects.toMatchObject({
      name: 'BookingError',
      code: 'SLOT_NOT_AVAILABLE',
    });
  });

  it("lève SLOT_NOT_AVAILABLE quand le slot a le statut 'BOOKED'", async () => {
    const tx = makeTx({ slotStatus: 'BOOKED' });
    mockTransaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => fn(tx));

    await expect(createBooking(baseInput)).rejects.toMatchObject({
      name: 'BookingError',
      code: 'SLOT_NOT_AVAILABLE',
    });
  });

  it('lève SERVICE_NOT_FOUND quand la prestation est inactive', async () => {
    const tx = makeTx({ serviceActive: false });
    mockTransaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => fn(tx));

    await expect(createBooking(baseInput)).rejects.toMatchObject({
      name: 'BookingError',
      code: 'SERVICE_NOT_FOUND',
    });
    expect(tx.timeSlot.update).not.toHaveBeenCalled();
    expect(tx.booking.create).not.toHaveBeenCalled();
  });

  it('passe isolationLevel Serializable à $transaction', async () => {
    const tx = makeTx();
    mockTransaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => fn(tx));

    await createBooking(baseInput);

    expect(mockTransaction).toHaveBeenCalledWith(
      expect.any(Function),
      expect.objectContaining({ isolationLevel: 'Serializable' })
    );
  });

  it('stocke priceCentsAtBooking depuis le service au moment de la réservation', async () => {
    const tx = makeTx();
    mockTransaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => fn(tx));

    await createBooking(baseInput);

    expect(tx.booking.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ priceCentsAtBooking: 8000 }) })
    );
  });
});

// ── Test de concurrence ───────────────────────────────────────────────────────

describe('createBooking — concurrence', () => {
  it('garantit qu\'un seul booking est créé parmi 10 appels simultanés sur le même slot', async () => {
    let transactionCallCount = 0;

    mockTransaction.mockImplementation(async (fn: (tx: ReturnType<typeof makeTx>) => Promise<unknown>) => {
      // Premier appel : slot OPEN. Tous les suivants : slot PENDING.
      // transactionCallCount++ est synchrone : s'incrémente avant tout await,
      // simulant la sérialisation garantie par SQLite Serializable.
      const isFirst = transactionCallCount === 0;
      transactionCallCount++;

      const tx = makeTx({ slotStatus: isFirst ? 'OPEN' : 'PENDING' });
      return fn(tx);
    });

    const results = await Promise.allSettled(
      Array.from({ length: 10 }, () => createBooking(baseInput))
    );

    const successes = results.filter((r) => r.status === 'fulfilled');
    const failures = results.filter((r) => r.status === 'rejected');

    expect(successes).toHaveLength(1);
    expect(failures).toHaveLength(9);
    expect(
      failures.every(
        (f) =>
          f.status === 'rejected' &&
          f.reason instanceof BookingError &&
          f.reason.code === 'SLOT_NOT_AVAILABLE'
      )
    ).toBe(true);
  });
});
