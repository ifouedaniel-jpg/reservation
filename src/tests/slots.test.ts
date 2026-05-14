import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { addDays } from 'date-fns';
import { fromZonedTime } from 'date-fns-tz';

// ── Mocks (hoisted before imports) ────────────────────────────────────────────

const mockFindManyRules = vi.hoisted(() => vi.fn());
const mockFindManyBlocked = vi.hoisted(() => vi.fn());
const mockFindManySlots = vi.hoisted(() => vi.fn());
const mockCreateMany = vi.hoisted(() => vi.fn());
const mockUpdateSlot = vi.hoisted(() => vi.fn());

vi.mock('@/lib/db', () => ({
  prisma: {
    recurringAvailability: { findMany: mockFindManyRules },
    blockedDate: { findMany: mockFindManyBlocked },
    timeSlot: {
      findMany: mockFindManySlots,
      createMany: mockCreateMany,
      update: mockUpdateSlot,
    },
  },
}));

import { computeSlots, computeAvailableStartTimes, regenerateSlots } from '@/lib/slots';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const PARIS_TZ = 'Europe/Paris';

// 2025-05-05 (Monday) — stable reference week
const MONDAY = new Date('2025-05-05T00:00:00.000Z');
const NEXT_MONDAY = addDays(MONDAY, 7);

// Règle : samedi 09:00–12:00 (fenêtre de 3h)
const satRule = { dayOfWeek: 6, startTime: '09:00', endTime: '12:00', slotMinutes: 30 };
const saturdayBlocked = { date: new Date('2025-05-10T00:00:00.000Z') }; // Samedi 10 mai

// ── computeSlots (pure) ───────────────────────────────────────────────────────

describe('computeSlots', () => {
  it('generates one window per rule per day', () => {
    // Samedi 10 mai, 09:00–12:00 → 1 fenêtre (pas 6 créneaux de 30 min)
    const slots = computeSlots([satRule], [], MONDAY, NEXT_MONDAY);
    expect(slots).toHaveLength(1);
  });

  it('sets startsAt to the correct UTC time', () => {
    const slots = computeSlots([satRule], [], MONDAY, NEXT_MONDAY);
    // 09:00 Paris le 10 mai = 07:00 UTC (UTC+2 en été)
    const expected = fromZonedTime('2025-05-10T09:00:00', PARIS_TZ);
    expect(slots[0].startsAt.getTime()).toBe(expected.getTime());
  });

  it('sets endsAt to the rule endTime', () => {
    const slots = computeSlots([satRule], [], MONDAY, NEXT_MONDAY);
    // 12:00 Paris = 10:00 UTC
    const expected = fromZonedTime('2025-05-10T12:00:00', PARIS_TZ);
    expect(slots[0].endsAt.getTime()).toBe(expected.getTime());
  });

  it('excludes the window on a blocked date', () => {
    const slots = computeSlots([satRule], [saturdayBlocked], MONDAY, NEXT_MONDAY);
    expect(slots).toHaveLength(0);
  });

  it('does not skip unblocked days when a different day is blocked', () => {
    const fridayBlocked = { date: new Date('2025-05-09T00:00:00.000Z') };
    const slots = computeSlots([satRule], [fridayBlocked], MONDAY, NEXT_MONDAY);
    expect(slots).toHaveLength(1); // Samedi non affecté
  });

  it('generates one window per rule when multiple rules on the same day', () => {
    const afternoon = { dayOfWeek: 6, startTime: '14:00', endTime: '16:00', slotMinutes: 30 };
    const slots = computeSlots([satRule, afternoon], [], MONDAY, NEXT_MONDAY);
    expect(slots).toHaveLength(2); // matin + après-midi
  });

  it('generates no windows when no rule matches the date range', () => {
    const sundayRule = { dayOfWeek: 0, startTime: '09:00', endTime: '12:00', slotMinutes: 30 };
    const monToSat = addDays(MONDAY, 6);
    const slots = computeSlots([sundayRule], [], MONDAY, monToSat);
    expect(slots).toHaveLength(0);
  });
});

// ── computeAvailableStartTimes (pure) ─────────────────────────────────────────

describe('computeAvailableStartTimes', () => {
  const window = {
    startsAt: fromZonedTime('2025-05-10T09:00:00', PARIS_TZ), // 07:00 UTC
    endsAt: fromZonedTime('2025-05-10T13:00:00', PARIS_TZ),   // 11:00 UTC — fenêtre de 4h
  };

  it('returns all start times for an empty window', () => {
    // Prestation 2h, pas de réservation, step 30 min → 9h, 9h30, 10h, 10h30, 11h = 5 créneaux
    const times = computeAvailableStartTimes(window, [], 120, 30);
    expect(times).toHaveLength(5);
    expect(times[0].toISOString()).toBe(fromZonedTime('2025-05-10T09:00:00', PARIS_TZ).toISOString());
    expect(times[4].toISOString()).toBe(fromZonedTime('2025-05-10T11:00:00', PARIS_TZ).toISOString());
  });

  it('excludes start times that would overlap an existing booking', () => {
    // Réservation existante 9h-11h, prestation 2h → seul 11h disponible
    const booked = [{
      bookingStartsAt: fromZonedTime('2025-05-10T09:00:00', PARIS_TZ),
      bookingEndsAt: fromZonedTime('2025-05-10T11:00:00', PARIS_TZ),
    }];
    const times = computeAvailableStartTimes(window, booked, 120, 30);
    expect(times).toHaveLength(1);
    expect(times[0].toISOString()).toBe(fromZonedTime('2025-05-10T11:00:00', PARIS_TZ).toISOString());
  });

  it('returns no start times when service duration exceeds remaining free time', () => {
    // Réservation 9h-11h, prestation 3h → 11h-13h = 2h seulement, pas assez
    const booked = [{
      bookingStartsAt: fromZonedTime('2025-05-10T09:00:00', PARIS_TZ),
      bookingEndsAt: fromZonedTime('2025-05-10T11:00:00', PARIS_TZ),
    }];
    const times = computeAvailableStartTimes(window, booked, 180, 30);
    expect(times).toHaveLength(0);
  });

  it('handles gap between two bookings', () => {
    // Fenêtre 9h-13h, réservations 9h-10h et 11h30-13h → libre 10h-11h30 (1h30)
    // Prestation 1h, step 30 min → 10h, 10h30 = 2 créneaux dans le trou
    const booked = [
      {
        bookingStartsAt: fromZonedTime('2025-05-10T09:00:00', PARIS_TZ),
        bookingEndsAt: fromZonedTime('2025-05-10T10:00:00', PARIS_TZ),
      },
      {
        bookingStartsAt: fromZonedTime('2025-05-10T11:30:00', PARIS_TZ),
        bookingEndsAt: fromZonedTime('2025-05-10T13:00:00', PARIS_TZ),
      },
    ];
    const times = computeAvailableStartTimes(window, booked, 60, 30);
    expect(times).toHaveLength(2);
    expect(times[0].toISOString()).toBe(fromZonedTime('2025-05-10T10:00:00', PARIS_TZ).toISOString());
    expect(times[1].toISOString()).toBe(fromZonedTime('2025-05-10T10:30:00', PARIS_TZ).toISOString());
  });

  it('returns no start times when service exactly fills the window and it is booked', () => {
    const booked = [{
      bookingStartsAt: fromZonedTime('2025-05-10T09:00:00', PARIS_TZ),
      bookingEndsAt: fromZonedTime('2025-05-10T13:00:00', PARIS_TZ),
    }];
    const times = computeAvailableStartTimes(window, booked, 30, 30);
    expect(times).toHaveLength(0);
  });
});

// ── regenerateSlots (with prisma mock) ────────────────────────────────────────

describe('regenerateSlots', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-05-05T12:00:00.000Z'));

    mockFindManyRules.mockResolvedValue([satRule]);
    mockFindManyBlocked.mockResolvedValue([]);
    mockFindManySlots.mockResolvedValue([]);
    mockCreateMany.mockResolvedValue({ count: 1 });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('does not create duplicate windows when they already exist', async () => {
    const existingSlots = computeSlots([satRule], [], MONDAY, addDays(MONDAY, 7));
    mockFindManySlots.mockResolvedValue(existingSlots);
    mockCreateMany.mockResolvedValue({ count: 0 });

    const count = await regenerateSlots(1);

    expect(mockCreateMany).not.toHaveBeenCalled();
    expect(count).toBe(0);
  });

  it('does not call slot update', async () => {
    await regenerateSlots(1);
    expect(mockUpdateSlot).not.toHaveBeenCalled();
  });

  it('skips a blocked Saturday', async () => {
    mockFindManyBlocked.mockResolvedValue([saturdayBlocked]);
    mockCreateMany.mockResolvedValue({ count: 0 });

    await regenerateSlots(1);

    expect(mockCreateMany).not.toHaveBeenCalled();
  });

  it('returns the count reported by prisma createMany', async () => {
    mockCreateMany.mockResolvedValue({ count: 8 });
    const count = await regenerateSlots(1);
    expect(count).toBe(8);
  });
});
