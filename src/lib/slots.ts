import { addDays, startOfDay, format } from 'date-fns';
import { toZonedTime, fromZonedTime } from 'date-fns-tz';
import { prisma } from '@/lib/db';
import { PARIS_TZ } from '@/lib/time';

type Rule = {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  slotMinutes: number;
};

type BlockedEntry = { date: Date };

export function computeSlots(
  rules: Rule[],
  blockedDates: BlockedEntry[],
  from: Date,
  to: Date,
): Array<{ startsAt: Date; endsAt: Date }> {
  const blockedSet = new Set(
    blockedDates.map((bd) => {
      const d = bd.date;
      return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
    }),
  );

  const startDayParis = startOfDay(toZonedTime(from, PARIS_TZ));
  const endDayParis = startOfDay(toZonedTime(to, PARIS_TZ));
  const totalDays = Math.floor(
    (endDayParis.getTime() - startDayParis.getTime()) / 86_400_000,
  );

  const slots: Array<{ startsAt: Date; endsAt: Date }> = [];

  for (let d = 0; d < totalDays; d++) {
    const dayParis = addDays(startDayParis, d);
    const dayStr = format(dayParis, 'yyyy-MM-dd');

    if (blockedSet.has(dayStr)) continue;

    const dayOfWeek = dayParis.getDay();
    const dayRules = rules.filter((r) => r.dayOfWeek === dayOfWeek);

    for (const rule of dayRules) {
      // Une seule fenêtre de disponibilité par règle par jour
      const startUtc = fromZonedTime(`${dayStr}T${rule.startTime}:00`, PARIS_TZ);
      const endUtc = fromZonedTime(`${dayStr}T${rule.endTime}:00`, PARIS_TZ);
      slots.push({ startsAt: startUtc, endsAt: endUtc });
    }
  }

  return slots;
}

type BookedInterval = { bookingStartsAt: Date; bookingEndsAt: Date };

/**
 * Calcule les heures de début disponibles dans une fenêtre de dispo,
 * en soustrayant les réservations actives et en filtrant par durée de prestation.
 * Le `stepMinutes` définit l'intervalle entre deux heures de début proposées.
 */
export function computeAvailableStartTimes(
  window: { startsAt: Date; endsAt: Date },
  activeBookings: BookedInterval[],
  serviceDurationMinutes: number,
  stepMinutes: number,
): Date[] {
  const serviceDurationMs = serviceDurationMinutes * 60_000;
  const stepMs = stepMinutes * 60_000;
  const windowEnd = window.endsAt.getTime();

  const booked = [...activeBookings].sort(
    (a, b) => a.bookingStartsAt.getTime() - b.bookingStartsAt.getTime(),
  );

  // Calcule les intervalles libres dans la fenêtre
  const free: { start: number; end: number }[] = [];
  let cursor = window.startsAt.getTime();
  for (const b of booked) {
    const bStart = b.bookingStartsAt.getTime();
    const bEnd = b.bookingEndsAt.getTime();
    if (bStart > cursor) {
      free.push({ start: cursor, end: bStart });
    }
    cursor = Math.max(cursor, bEnd);
  }
  if (cursor < windowEnd) {
    free.push({ start: cursor, end: windowEnd });
  }

  // Génère les heures de début possibles dans chaque intervalle libre
  const result: Date[] = [];
  for (const interval of free) {
    let t = interval.start;
    while (t + serviceDurationMs <= interval.end) {
      result.push(new Date(t));
      t += stepMs;
    }
  }
  return result;
}

export async function regenerateSlots(weeksAhead = 8): Promise<number> {
  const nowUtc = new Date();
  const windowEnd = addDays(nowUtc, weeksAhead * 7);

  const [rules, blockedDates] = await Promise.all([
    prisma.recurringAvailability.findMany({ where: { active: true } }),
    prisma.blockedDate.findMany({
      where: {
        date: { gte: startOfDay(nowUtc), lt: windowEnd },
      },
    }),
  ]);

  const slots = computeSlots(rules, blockedDates, nowUtc, windowEnd);

  const existing = await prisma.timeSlot.findMany({
    where: { startsAt: { in: slots.map((s) => s.startsAt) } },
    select: { startsAt: true },
  });
  const existingMs = new Set(existing.map((s) => s.startsAt.getTime()));
  const newSlots = slots.filter((s) => !existingMs.has(s.startsAt.getTime()));

  if (newSlots.length === 0) return 0;

  const result = await prisma.timeSlot.createMany({
    data: newSlots.map((s) => ({ ...s, status: 'OPEN' })),
  });

  return result.count;
}
