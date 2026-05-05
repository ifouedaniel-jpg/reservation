import { addDays } from 'date-fns';
import { prisma } from '@/lib/db';
import { formatParis, utcToParis } from '@/lib/time';
import { RecurringForm } from '@/components/admin/RecurringForm';
import { BlockedDateForm } from '@/components/admin/BlockedDateForm';
import { ToggleRecurringButton } from '@/components/admin/ToggleRecurringButton';
import { DeleteRecurringButton } from '@/components/admin/DeleteRecurringButton';
import { DeleteBlockedDateButton } from '@/components/admin/DeleteBlockedDateButton';
import { RegenerateButton } from '@/components/admin/RegenerateButton';
import { SlotToggleButton } from '@/components/admin/SlotToggleButton';

const DAY_NAMES_PLURAL = [
  'dimanches',
  'lundis',
  'mardis',
  'mercredis',
  'jeudis',
  'vendredis',
  'samedis',
];

const FRENCH_DAYS = [
  'Dimanche',
  'Lundi',
  'Mardi',
  'Mercredi',
  'Jeudi',
  'Vendredi',
  'Samedi',
];

function formatRecurringRule(rule: {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  slotMinutes: number;
}) {
  const day = DAY_NAMES_PLURAL[rule.dayOfWeek] ?? `jour ${rule.dayOfWeek}`;
  return `Tous les ${day} de ${rule.startTime} à ${rule.endTime} (créneaux de ${rule.slotMinutes} min)`;
}

function formatBlockedDate(date: Date) {
  const d = date.getUTCDate().toString().padStart(2, '0');
  const m = (date.getUTCMonth() + 1).toString().padStart(2, '0');
  const y = date.getUTCFullYear();
  return `${d}/${m}/${y}`;
}

export default async function DisponibilitesPage() {
  const now = new Date();
  const windowEnd = addDays(now, 8 * 7);

  const [recurringRules, blockedDates, upcomingSlots] = await Promise.all([
    prisma.recurringAvailability.findMany({
      orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
    }),
    prisma.blockedDate.findMany({ orderBy: { date: 'asc' } }),
    prisma.timeSlot.findMany({
      where: { startsAt: { gte: now, lt: windowEnd } },
      orderBy: { startsAt: 'asc' },
    }),
  ]);

  // Group slots by Paris calendar date
  const slotsByDate = new Map<string, typeof upcomingSlots>();
  for (const slot of upcomingSlots) {
    const key = formatParis(slot.startsAt, 'yyyy-MM-dd');
    if (!slotsByDate.has(key)) slotsByDate.set(key, []);
    slotsByDate.get(key)!.push(slot);
  }

  return (
    <div className="space-y-10">
      <h1 className="text-2xl font-semibold">Disponibilités</h1>

      {/* ── Section 1 : Règles récurrentes ── */}
      <section className="space-y-4">
        <h2 className="text-xl font-medium">Règles récurrentes</h2>

        {recurringRules.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucune règle définie.</p>
        ) : (
          <div className="space-y-2">
            {recurringRules.map((rule) => (
              <div
                key={rule.id}
                className="flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex items-center gap-3">
                  <span
                    className={
                      rule.active ? 'text-sm' : 'text-sm text-muted-foreground line-through'
                    }
                  >
                    {formatRecurringRule(rule)}
                  </span>
                  {!rule.active && (
                    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500">
                      Inactive
                    </span>
                  )}
                </div>
                <div className="flex shrink-0 gap-2">
                  <ToggleRecurringButton id={rule.id} active={rule.active} />
                  <DeleteRecurringButton id={rule.id} />
                </div>
              </div>
            ))}
          </div>
        )}

        <RecurringForm />
      </section>

      {/* ── Section 2 : Dates bloquées ── */}
      <section className="space-y-4">
        <h2 className="text-xl font-medium">Dates bloquées</h2>

        {blockedDates.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucune date bloquée.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-3 text-left font-medium">Date</th>
                  <th className="px-4 py-3 text-left font-medium">Raison</th>
                  <th className="px-4 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {blockedDates.map((bd) => {
                  const label = formatBlockedDate(bd.date);
                  return (
                    <tr key={bd.id} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="px-4 py-3 font-medium">{label}</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {bd.reason ?? <span className="italic">—</span>}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <DeleteBlockedDateButton id={bd.id} label={label} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <BlockedDateForm />
      </section>

      {/* ── Section 3 : Créneaux ── */}
      <section className="space-y-6">
        <h2 className="text-xl font-medium">Créneaux à venir</h2>

        <RegenerateButton />

        {slotsByDate.size === 0 ? (
          <p className="text-sm text-muted-foreground">
            Aucun créneau généré. Cliquez sur &laquo;&nbsp;Régénérer&nbsp;&raquo; pour en créer.
          </p>
        ) : (
          <div className="space-y-4">
            {Array.from(slotsByDate.entries()).map(([dateKey, daySlots]) => {
              const parisDate = utcToParis(daySlots[0].startsAt);
              const dayLabel = `${FRENCH_DAYS[parisDate.getDay()]} ${formatParis(daySlots[0].startsAt, 'dd/MM/yyyy')}`;
              return (
                <div key={dateKey} className="space-y-1.5">
                  <p className="text-sm font-medium text-muted-foreground">{dayLabel}</p>
                  <div className="flex flex-wrap gap-1">
                    {daySlots.map((slot) => (
                      <SlotToggleButton
                        key={slot.id}
                        id={slot.id}
                        time={formatParis(slot.startsAt, 'HH:mm')}
                        status={slot.status}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
