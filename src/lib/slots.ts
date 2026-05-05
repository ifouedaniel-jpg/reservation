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

  // Work in Paris "fake-UTC" space so date arithmetic stays on calendar days
  const startDayParis = startOfDay(toZonedTime(from, PARIS_TZ));
  const endDayParis = startOfDay(toZonedTime(to, PARIS_TZ));
  const totalDays = Math.floor(
    (endDayParis.getTime() - startDayParis.getTime()) / 86_400_000,
  );

  const slots: Array<{ startsAt: Date; endsAt: Date }> = [];

  for (let d = 0; d < totalDays; d++) {
    const dayParis = addDays(startDayParis, d);
    const dayStr = format(dayParis, 'yyyy-MM-dd'); // Paris calendar date

    if (blockedSet.has(dayStr)) continue;

    const dayOfWeek = dayParis.getDay();
    const dayRules = rules.filter((r) => r.dayOfWeek === dayOfWeek);

    for (const rule of dayRules) {
      const startUtc = fromZonedTime(`${dayStr}T${rule.startTime}:00`, PARIS_TZ);
      const endUtc = fromZonedTime(`${dayStr}T${rule.endTime}:00`, PARIS_TZ);
      const stepMs = rule.slotMinutes * 60_000;

      let current = startUtc.getTime();
      const end = endUtc.getTime();

      while (current + stepMs <= end) {
        slots.push({
          startsAt: new Date(current),
          endsAt: new Date(current + stepMs),
        });
        current += stepMs;
      }
    }
  }

  return slots;
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

  // Fetch existing startsAt in the window to avoid creating duplicate or overwriting slots
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
