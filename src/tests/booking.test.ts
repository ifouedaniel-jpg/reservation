import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BookingError } from '@/lib/booking';

// ── Mocks (hoisted before imports) ────────────────────────────────────────────

const mockTransaction = vi.hoisted(() => vi.fn());
const mockBookingFindUnique = vi.hoisted(() => vi.fn());
const mockBookingUpdate = vi.hoisted(() => vi.fn());

vi.mock('@/lib/db', () => ({
  prisma: {
    $transaction: mockTransaction,
    booking: {
      findUnique: mockBookingFindUnique,
      update: mockBookingUpdate,
    },
  },
}));

import {
  createBooking,
  confirmBooking,
  rejectBooking,
  cancelBooking,
  markCompleted,
  markNoShow,
} from '@/lib/booking';

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

function makeAdminTx({ bookingStatus = 'PENDING' }: { bookingStatus?: string } = {}) {
  const booking = { ...mockBooking, status: bookingStatus };
  return {
    booking: {
      findUnique: vi.fn().mockResolvedValue(booking),
      update: vi.fn().mockImplementation(({ data }: { data: Record<string, unknown> }) =>
        Promise.resolve({ ...booking, ...data })
      ),
    },
    timeSlot: {
      update: vi.fn().mockResolvedValue({}),
    },
  };
}

type AdminTx = ReturnType<typeof makeAdminTx>;

// ── createBooking ─────────────────────────────────────────────────────────────

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

// ── createBooking — concurrence ───────────────────────────────────────────────

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

// ── confirmBooking ────────────────────────────────────────────────────────────

describe('confirmBooking', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('passe le slot en BOOKED et le booking en CONFIRMED', async () => {
    const tx = makeAdminTx({ bookingStatus: 'PENDING' });
    mockTransaction.mockImplementation(async (fn: (tx: AdminTx) => Promise<unknown>) => fn(tx));

    await confirmBooking('booking-1');

    expect(tx.timeSlot.update).toHaveBeenCalledWith({
      where: { id: 'slot-1' },
      data: { status: 'BOOKED' },
    });
    expect(tx.booking.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'booking-1' },
        data: expect.objectContaining({ status: 'CONFIRMED', confirmedAt: expect.any(Date) }),
      })
    );
  });

  it('lève INVALID_TRANSITION si le booking est CANCELLED', async () => {
    const tx = makeAdminTx({ bookingStatus: 'CANCELLED' });
    mockTransaction.mockImplementation(async (fn: (tx: AdminTx) => Promise<unknown>) => fn(tx));

    await expect(confirmBooking('booking-1')).rejects.toMatchObject({
      name: 'BookingTransitionError',
      code: 'INVALID_TRANSITION',
    });
    expect(tx.timeSlot.update).not.toHaveBeenCalled();
  });

  it('lève INVALID_TRANSITION si le booking est déjà CONFIRMED', async () => {
    const tx = makeAdminTx({ bookingStatus: 'CONFIRMED' });
    mockTransaction.mockImplementation(async (fn: (tx: AdminTx) => Promise<unknown>) => fn(tx));

    await expect(confirmBooking('booking-1')).rejects.toMatchObject({
      name: 'BookingTransitionError',
      code: 'INVALID_TRANSITION',
    });
  });

  it('lève BOOKING_NOT_FOUND si le booking est introuvable', async () => {
    const tx = { booking: { findUnique: vi.fn().mockResolvedValue(null), update: vi.fn() }, timeSlot: { update: vi.fn() } };
    mockTransaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => fn(tx));

    await expect(confirmBooking('nonexistent')).rejects.toMatchObject({
      name: 'BookingTransitionError',
      code: 'BOOKING_NOT_FOUND',
    });
  });
});

// ── rejectBooking ─────────────────────────────────────────────────────────────

describe('rejectBooking', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('libère le slot (OPEN) et passe le booking en REJECTED', async () => {
    const tx = makeAdminTx({ bookingStatus: 'PENDING' });
    mockTransaction.mockImplementation(async (fn: (tx: AdminTx) => Promise<unknown>) => fn(tx));

    await rejectBooking('booking-1', 'Complet');

    expect(tx.timeSlot.update).toHaveBeenCalledWith({
      where: { id: 'slot-1' },
      data: { status: 'OPEN' },
    });
    expect(tx.booking.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'REJECTED', cancellationReason: 'Complet' }),
      })
    );
  });

  it('lève INVALID_TRANSITION si le booking est CONFIRMED', async () => {
    const tx = makeAdminTx({ bookingStatus: 'CONFIRMED' });
    mockTransaction.mockImplementation(async (fn: (tx: AdminTx) => Promise<unknown>) => fn(tx));

    await expect(rejectBooking('booking-1')).rejects.toMatchObject({
      name: 'BookingTransitionError',
      code: 'INVALID_TRANSITION',
    });
    expect(tx.timeSlot.update).not.toHaveBeenCalled();
  });

  it('lève INVALID_TRANSITION si le booking est déjà REJECTED', async () => {
    const tx = makeAdminTx({ bookingStatus: 'REJECTED' });
    mockTransaction.mockImplementation(async (fn: (tx: AdminTx) => Promise<unknown>) => fn(tx));

    await expect(rejectBooking('booking-1')).rejects.toMatchObject({
      name: 'BookingTransitionError',
      code: 'INVALID_TRANSITION',
    });
  });
});

// ── cancelBooking ─────────────────────────────────────────────────────────────

describe('cancelBooking', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('libère le slot et passe le booking en CANCELLED depuis PENDING', async () => {
    const tx = makeAdminTx({ bookingStatus: 'PENDING' });
    mockTransaction.mockImplementation(async (fn: (tx: AdminTx) => Promise<unknown>) => fn(tx));

    await cancelBooking('booking-1');

    expect(tx.timeSlot.update).toHaveBeenCalledWith({
      where: { id: 'slot-1' },
      data: { status: 'OPEN' },
    });
    expect(tx.booking.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'CANCELLED', cancelledAt: expect.any(Date) }),
      })
    );
  });

  it('libère le slot et passe le booking en CANCELLED depuis CONFIRMED', async () => {
    const tx = makeAdminTx({ bookingStatus: 'CONFIRMED' });
    mockTransaction.mockImplementation(async (fn: (tx: AdminTx) => Promise<unknown>) => fn(tx));

    await cancelBooking('booking-1', 'Empêchement');

    expect(tx.timeSlot.update).toHaveBeenCalledWith({
      where: { id: 'slot-1' },
      data: { status: 'OPEN' },
    });
    expect(tx.booking.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'CANCELLED', cancellationReason: 'Empêchement' }),
      })
    );
  });

  it('lève INVALID_TRANSITION si le booking est REJECTED', async () => {
    const tx = makeAdminTx({ bookingStatus: 'REJECTED' });
    mockTransaction.mockImplementation(async (fn: (tx: AdminTx) => Promise<unknown>) => fn(tx));

    await expect(cancelBooking('booking-1')).rejects.toMatchObject({
      name: 'BookingTransitionError',
      code: 'INVALID_TRANSITION',
    });
    expect(tx.timeSlot.update).not.toHaveBeenCalled();
  });

  it('lève INVALID_TRANSITION si le booking est déjà CANCELLED', async () => {
    const tx = makeAdminTx({ bookingStatus: 'CANCELLED' });
    mockTransaction.mockImplementation(async (fn: (tx: AdminTx) => Promise<unknown>) => fn(tx));

    await expect(cancelBooking('booking-1')).rejects.toMatchObject({
      name: 'BookingTransitionError',
      code: 'INVALID_TRANSITION',
    });
  });
});

// ── markCompleted ─────────────────────────────────────────────────────────────

describe('markCompleted', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('passe le booking en COMPLETED depuis CONFIRMED', async () => {
    mockBookingFindUnique.mockResolvedValue({ ...mockBooking, status: 'CONFIRMED' });
    mockBookingUpdate.mockResolvedValue({ ...mockBooking, status: 'COMPLETED' });

    await markCompleted('booking-1');

    expect(mockBookingUpdate).toHaveBeenCalledWith({
      where: { id: 'booking-1' },
      data: { status: 'COMPLETED' },
    });
  });

  it('lève INVALID_TRANSITION depuis PENDING', async () => {
    mockBookingFindUnique.mockResolvedValue({ ...mockBooking, status: 'PENDING' });

    await expect(markCompleted('booking-1')).rejects.toMatchObject({
      name: 'BookingTransitionError',
      code: 'INVALID_TRANSITION',
    });
    expect(mockBookingUpdate).not.toHaveBeenCalled();
  });

  it('lève BOOKING_NOT_FOUND si le booking est introuvable', async () => {
    mockBookingFindUnique.mockResolvedValue(null);

    await expect(markCompleted('nonexistent')).rejects.toMatchObject({
      name: 'BookingTransitionError',
      code: 'BOOKING_NOT_FOUND',
    });
  });
});

// ── markNoShow ────────────────────────────────────────────────────────────────

describe('markNoShow', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('passe le booking en NO_SHOW depuis CONFIRMED', async () => {
    mockBookingFindUnique.mockResolvedValue({ ...mockBooking, status: 'CONFIRMED' });
    mockBookingUpdate.mockResolvedValue({ ...mockBooking, status: 'NO_SHOW' });

    await markNoShow('booking-1');

    expect(mockBookingUpdate).toHaveBeenCalledWith({
      where: { id: 'booking-1' },
      data: { status: 'NO_SHOW' },
    });
  });

  it('lève INVALID_TRANSITION depuis PENDING', async () => {
    mockBookingFindUnique.mockResolvedValue({ ...mockBooking, status: 'PENDING' });

    await expect(markNoShow('booking-1')).rejects.toMatchObject({
      name: 'BookingTransitionError',
      code: 'INVALID_TRANSITION',
    });
    expect(mockBookingUpdate).not.toHaveBeenCalled();
  });

  it('lève BOOKING_NOT_FOUND si le booking est introuvable', async () => {
    mockBookingFindUnique.mockResolvedValue(null);

    await expect(markNoShow('nonexistent')).rejects.toMatchObject({
      name: 'BookingTransitionError',
      code: 'BOOKING_NOT_FOUND',
    });
  });
});
