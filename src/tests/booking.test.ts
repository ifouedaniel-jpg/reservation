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

// Fenêtre de disponibilité : 9h-17h UTC le 1er juin 2026
const WINDOW_START = new Date('2026-06-01T07:00:00.000Z'); // 09:00 Paris
const WINDOW_END   = new Date('2026-06-01T15:00:00.000Z'); // 17:00 Paris
// RDV de 2h : 11h-13h Paris
const BOOKING_START = new Date('2026-06-01T09:00:00.000Z'); // 11:00 Paris
const BOOKING_END   = new Date('2026-06-01T11:00:00.000Z'); // 13:00 Paris

const baseInput = {
  firstName: 'Marie',
  phone: '+33612345678',
  notes: undefined,
  gdprConsent: true as const,
  serviceId: 'service-1',
  timeSlotId: 'slot-1',
  bookingStartsAt: BOOKING_START.toISOString(),
  bookingEndsAt: BOOKING_END.toISOString(),
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
  startsAt: WINDOW_START,
  endsAt: WINDOW_END,
  status: 'OPEN',
};

const mockBooking = {
  id: 'booking-1',
  publicCode: 'pub-code-abc',
  customerFirstName: 'Marie',
  customerPhone: '+33612345678',
  serviceId: 'service-1',
  timeSlotId: 'slot-1',
  bookingStartsAt: BOOKING_START,
  bookingEndsAt: BOOKING_END,
  priceCentsAtBooking: 8000,
  status: 'PENDING',
  createdAt: new Date(),
  updatedAt: new Date(),
};

type TxOptions = {
  slotStatus?: string;
  serviceActive?: boolean;
  overlapping?: number;
};

function makeTx({ slotStatus = 'OPEN', serviceActive = true, overlapping = 0 }: TxOptions = {}) {
  return {
    service: {
      findUnique: vi.fn().mockResolvedValue(serviceActive ? mockService : null),
    },
    timeSlot: {
      findUnique: vi.fn().mockResolvedValue({ ...mockSlot, status: slotStatus }),
    },
    booking: {
      count: vi.fn().mockResolvedValue(overlapping),
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
  };
}

type AdminTx = ReturnType<typeof makeAdminTx>;

// ── createBooking ─────────────────────────────────────────────────────────────

describe('createBooking', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('crée un booking et retourne le publicCode quand le slot est OPEN et sans chevauchement', async () => {
    const tx = makeTx();
    mockTransaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => fn(tx));

    const result = await createBooking(baseInput);

    expect(result.publicCode).toBe('pub-code-abc');
    expect(tx.booking.count).toHaveBeenCalledOnce();
    expect(tx.booking.create).toHaveBeenCalledOnce();
  });

  it('stocke bookingStartsAt et bookingEndsAt dans le booking', async () => {
    const tx = makeTx();
    mockTransaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => fn(tx));

    await createBooking(baseInput);

    expect(tx.booking.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          bookingStartsAt: BOOKING_START,
          bookingEndsAt: BOOKING_END,
        }),
      })
    );
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

  it('lève SLOT_NOT_AVAILABLE quand un chevauchement existe', async () => {
    const tx = makeTx({ overlapping: 1 });
    mockTransaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => fn(tx));

    await expect(createBooking(baseInput)).rejects.toMatchObject({
      name: 'BookingError',
      code: 'SLOT_NOT_AVAILABLE',
    });
    expect(tx.booking.create).not.toHaveBeenCalled();
  });

  it('lève SERVICE_NOT_FOUND quand la prestation est inactive', async () => {
    const tx = makeTx({ serviceActive: false });
    mockTransaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => fn(tx));

    await expect(createBooking(baseInput)).rejects.toMatchObject({
      name: 'BookingError',
      code: 'SERVICE_NOT_FOUND',
    });
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

  it('stocke priceCentsAtBooking depuis le service', async () => {
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
  it('garantit qu\'un seul booking est créé parmi 10 appels simultanés sur la même plage horaire', async () => {
    let transactionCallCount = 0;

    mockTransaction.mockImplementation(async (fn: (tx: ReturnType<typeof makeTx>) => Promise<unknown>) => {
      // Premier appel : pas de chevauchement. Tous les suivants : 1 chevauchement.
      const isFirst = transactionCallCount === 0;
      transactionCallCount++;

      const tx = makeTx({ overlapping: isFirst ? 0 : 1 });
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

  it('passe le booking en CONFIRMED depuis PENDING', async () => {
    const tx = makeAdminTx({ bookingStatus: 'PENDING' });
    mockTransaction.mockImplementation(async (fn: (tx: AdminTx) => Promise<unknown>) => fn(tx));

    await confirmBooking('booking-1');

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
    expect(tx.booking.update).not.toHaveBeenCalled();
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
    const tx = { booking: { findUnique: vi.fn().mockResolvedValue(null), update: vi.fn() } };
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

  it('passe le booking en REJECTED depuis PENDING', async () => {
    const tx = makeAdminTx({ bookingStatus: 'PENDING' });
    mockTransaction.mockImplementation(async (fn: (tx: AdminTx) => Promise<unknown>) => fn(tx));

    await rejectBooking('booking-1', 'Complet');

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
    expect(tx.booking.update).not.toHaveBeenCalled();
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

  it('passe le booking en CANCELLED depuis PENDING', async () => {
    const tx = makeAdminTx({ bookingStatus: 'PENDING' });
    mockTransaction.mockImplementation(async (fn: (tx: AdminTx) => Promise<unknown>) => fn(tx));

    await cancelBooking('booking-1');

    expect(tx.booking.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'CANCELLED', cancelledAt: expect.any(Date) }),
      })
    );
  });

  it('passe le booking en CANCELLED depuis CONFIRMED avec motif', async () => {
    const tx = makeAdminTx({ bookingStatus: 'CONFIRMED' });
    mockTransaction.mockImplementation(async (fn: (tx: AdminTx) => Promise<unknown>) => fn(tx));

    await cancelBooking('booking-1', 'Empêchement');

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
    expect(tx.booking.update).not.toHaveBeenCalled();
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
