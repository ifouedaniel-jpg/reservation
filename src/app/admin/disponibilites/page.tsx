export const dynamic = 'force-dynamic'
import { prisma } from '@/lib/db';
import { formatParis, parisToUtc } from '@/lib/time';
import { DateNav } from '@/components/admin/DateNav';
import { ManualSlotForm } from '@/components/admin/ManualSlotForm';
import { SlotRow } from '@/components/admin/SlotRow';

export default async function DisponibilitesPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const params = await searchParams;

  const todayStr = formatParis(new Date(), 'yyyy-MM-dd');
  const dateStr = params.date ?? todayStr;

  const dayStartUtc = parisToUtc(`${dateStr}T00:00:00`);
  const dayEndUtc = parisToUtc(`${dateStr}T23:59:59`);

  const slots = await prisma.timeSlot.findMany({
    where: { startsAt: { gte: dayStartUtc, lte: dayEndUtc } },
    orderBy: { startsAt: 'asc' },
  });

  const dayLabel = formatParis(dayStartUtc, 'EEEE dd MMMM yyyy');

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-semibold">Disponibilités</h1>

      {/* Navigation par date */}
      <div className="flex flex-wrap items-center gap-4">
        <DateNav date={dateStr} />
        <span className="text-base font-medium capitalize text-muted-foreground">
          {dayLabel}
        </span>
      </div>

      {/* Créneaux du jour */}
      <section className="space-y-4">
        <h2 className="text-lg font-medium capitalize">
          Créneaux — {dayLabel}
        </h2>

        {slots.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Aucun créneau pour cette date. Utilisez le formulaire ci-dessous pour en ajouter.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-3 text-left font-medium">Début</th>
                  <th className="px-4 py-3 text-left font-medium">Fin</th>
                  <th className="px-4 py-3 text-left font-medium">Statut</th>
                  <th className="px-4 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {slots.map((slot) => (
                  <SlotRow
                    key={slot.id}
                    id={slot.id}
                    startTime={formatParis(slot.startsAt, 'HH:mm')}
                    endTime={formatParis(slot.endsAt, 'HH:mm')}
                    status={slot.status}
                    dateStr={dateStr}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <ManualSlotForm date={dateStr} />
    </div>
  );
}
