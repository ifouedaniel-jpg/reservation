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

import { computeSlots, regenerateSlots } from '@/lib/slots';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const PARIS_TZ = 'Europe/Paris';

// 2025-05-05 (Monday) — stable reference week
const MONDAY = new Date('2025-05-05T00:00:00.000Z');
const NEXT_MONDAY = addDays(MONDAY, 7);

const satRule = { dayOfWeek: 6, startTime: '09:00', endTime: '12:00', slotMinutes: 30 };
const saturdayBlocked = { date: new Date('2025-05-10T00:00:00.000Z') }; // Saturday May 10

// ── computeSlots (pure) ───────────────────────────────────────────────────────

describe('computeSlots', () => {
  it('generates the correct number of slots for a rule', () => {
    // Saturday May 10, 09:00–12:00, 30 min → 6 slots
    const slots = computeSlots([satRule], [], MONDAY, NEXT_MONDAY);
    expect(slots).toHaveLength(6);
  });

  it('sets startsAt to the correct UTC time', () => {
    const slots = computeSlots([satRule], [], MONDAY, NEXT_MONDAY);
    // 09:00 Paris on May 10 = 07:00 UTC (UTC+2 in summer)
    const expected = fromZonedTime('2025-05-10T09:00:00', PARIS_TZ);
    expect(slots[0].startsAt.getTime()).toBe(expected.getTime());
  });

  it('sets endsAt to startsAt + slotMinutes', () => {
    const slots = computeSlots([satRule], [], MONDAY, NEXT_MONDAY);
    const diff = slots[0].endsAt.getTime() - slots[0].startsAt.getTime();
    expect(diff).toBe(30 * 60_000);
  });

  it('excludes all slots on a blocked date', () => {
    const slots = computeSlots([satRule], [saturdayBlocked], MONDAY, NEXT_MONDAY);
    expect(slots).toHaveLength(0);
  });

  it('does not skip unblocked days when a different day is blocked', () => {
    const fridayBlocked = { date: new Date('2025-05-09T00:00:00.000Z') };
    const slots = computeSlots([satRule], [fridayBlocked], MONDAY, NEXT_MONDAY);
    expect(slots).toHaveLength(6); // Saturday unaffected
  });

  it('accumulates slots from multiple rules on the same day', () => {
    const afternoon = { dayOfWeek: 6, startTime: '14:00', endTime: '16:00', slotMinutes: 30 };
    const slots = computeSlots([satRule, afternoon], [], MONDAY, NEXT_MONDAY);
    expect(slots).toHaveLength(10); // 6 morning + 4 afternoon
  });

  it('generates no slots when no rule matches the window', () => {
    const sundayRule = { dayOfWeek: 0, startTime: '09:00', endTime: '12:00', slotMinutes: 30 };
    // Monday→Saturday (6 days): Mon 5, Tue 6, Wed 7, Thu 8, Fri 9, Sat 10 — no Sunday
    const monToSat = addDays(MONDAY, 6);
    const slots = computeSlots([sundayRule], [], MONDAY, monToSat);
    expect(slots).toHaveLength(0);
  });
});

// ── regenerateSlots (with prisma mock) ────────────────────────────────────────

describe('regenerateSlots', () => {
  beforeEach(() => {
    // Pin "now" to Monday 2025-05-05 12:00 UTC so the window is deterministic
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-05-05T12:00:00.000Z'));

    mockFindManyRules.mockResolvedValue([satRule]);
    mockFindManyBlocked.mockResolvedValue([]);
    // No existing slots by default
    mockFindManySlots.mockResolvedValue([]);
    mockCreateMany.mockResolvedValue({ count: 6 });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('does not create duplicate slots when they already exist', async () => {
    // Return all 6 Saturday slots as already existing
    const existingSlots = computeSlots([satRule], [], MONDAY, addDays(MONDAY, 7));
    mockFindManySlots.mockResolvedValue(existingSlots);
    mockCreateMany.mockResolvedValue({ count: 0 });

    const count = await regenerateSlots(1);

    // createMany is never called when all slots already exist
    expect(mockCreateMany).not.toHaveBeenCalled();
    expect(count).toBe(0);
  });

  it('does not call update — BOOKED/PENDING slots are left untouched', async () => {
    await regenerateSlots(1);
    expect(mockUpdateSlot).not.toHaveBeenCalled();
  });

  it('skips a blocked Saturday — createMany receives no data for that day', async () => {
    mockFindManyBlocked.mockResolvedValue([saturdayBlocked]);
    mockCreateMany.mockResolvedValue({ count: 0 });

    await regenerateSlots(1);

    // No slots computed → createMany never called
    expect(mockCreateMany).not.toHaveBeenCalled();
  });

  it('returns the count reported by prisma createMany', async () => {
    mockCreateMany.mockResolvedValue({ count: 42 });
    const count = await regenerateSlots(1);
    expect(count).toBe(42);
  });
});
