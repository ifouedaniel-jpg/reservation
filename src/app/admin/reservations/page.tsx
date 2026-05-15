export const dynamic = 'force-dynamic'
import Link from 'next/link';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { formatParis } from '@/lib/time';
import { cn } from '@/lib/utils';
import BookingStatusBadge from '@/components/booking/BookingStatusBadge';

const PAGE_SIZE = 20;

const STATUS_FILTERS = [
  { label: 'En attente', value: 'PENDING' },
  { label: 'Confirmées', value: 'CONFIRMED' },
  { label: 'Refusées', value: 'REJECTED' },
  { label: 'Annulées', value: 'CANCELLED' },
  { label: 'Terminées', value: 'COMPLETED' },
  { label: 'No-show', value: 'NO_SHOW' },
  { label: 'Toutes', value: 'ALL' },
];

type Props = { searchParams: Promise<{ status?: string; page?: string }> };

export default async function AdminReservationsPage({ searchParams }: Props) {
  await requireAdmin();

  const { status = 'PENDING', page: pageStr = '1' } = await searchParams;
  const page = Math.max(1, parseInt(pageStr, 10) || 1);
  const where = status === 'ALL' ? {} : { status };

  const [bookings, total] = await Promise.all([
    prisma.booking.findMany({
      where,
      include: { service: true },
      orderBy: { bookingStartsAt: 'asc' },
      take: PAGE_SIZE,
      skip: (page - 1) * PAGE_SIZE,
    }),
    prisma.booking.count({ where }),
  ]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Réservations</h1>

      {/* Filtres */}
      <div className="flex flex-wrap gap-2">
        {STATUS_FILTERS.map((f) => (
          <Link
            key={f.value}
            href={`/admin/reservations?status=${f.value}`}
            className={cn(
              'rounded-full border px-3 py-1 text-sm transition-colors',
              status === f.value
                ? 'bg-foreground text-background border-foreground'
                : 'text-muted-foreground hover:bg-accent'
            )}
          >
            {f.label}
          </Link>
        ))}
      </div>

      {/* Tableau */}
      {bookings.length === 0 ? (
        <p className="text-sm text-muted-foreground">Aucune réservation trouvée.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border">
          <table className="min-w-full text-sm">
            <thead className="border-b bg-muted/40">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Date du créneau</th>
                <th className="px-4 py-3 text-left font-medium">Cliente</th>
                <th className="px-4 py-3 text-left font-medium">Prestation</th>
                <th className="px-4 py-3 text-left font-medium">Statut</th>
                <th className="px-4 py-3 text-left font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {bookings.map((b) => (
                <tr key={b.id} className="hover:bg-muted/30">
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className="capitalize">
                      {formatParis(b.bookingStartsAt, 'EEE d MMM')}
                    </span>
                    {' '}
                    {formatParis(b.bookingStartsAt, 'yyyy')}
                    {' à '}
                    {formatParis(b.bookingStartsAt, "HH'h'mm")}
                  </td>
                  <td className="px-4 py-3">
                    {b.customerFirstName}
                  </td>
                  <td className="px-4 py-3">{b.service.name}</td>
                  <td className="px-4 py-3">
                    <BookingStatusBadge status={b.status} />
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/reservations/${b.id}`}
                      className="font-medium hover:underline"
                    >
                      Voir →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            Page {page} / {totalPages} ({total} résultat{total > 1 ? 's' : ''})
          </p>
          <div className="flex gap-2">
            {page > 1 && (
              <Link
                href={`/admin/reservations?status=${status}&page=${page - 1}`}
                className="rounded-md border px-3 py-1 text-sm hover:bg-accent"
              >
                ← Précédent
              </Link>
            )}
            {page < totalPages && (
              <Link
                href={`/admin/reservations?status=${status}&page=${page + 1}`}
                className="rounded-md border px-3 py-1 text-sm hover:bg-accent"
              >
                Suivant →
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
