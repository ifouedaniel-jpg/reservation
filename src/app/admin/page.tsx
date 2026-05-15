export const dynamic = 'force-dynamic'
import Link from 'next/link';
import { startOfMonth, endOfMonth, subDays } from 'date-fns';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { formatParis, parisToUtc, utcToParis } from '@/lib/time';

function formatPrice(cents: number) {
  return (cents / 100).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' });
}

export default async function AdminPage() {
  await requireAdmin();

  const now = new Date();
  const nowParis = utcToParis(now);
  const startMonthUtc = parisToUtc(startOfMonth(nowParis));
  const endMonthUtc = parisToUtc(endOfMonth(nowParis));
  const thirtyDaysAgo = subDays(now, 30);

  const [upcomingCount, pendingCount, monthlyRevenue, topServices, nextBookings] =
    await Promise.all([
      prisma.booking.count({
        where: { status: 'CONFIRMED', bookingStartsAt: { gte: now } },
      }),
      prisma.booking.count({ where: { status: 'PENDING' } }),
      prisma.booking.aggregate({
        where: {
          status: 'CONFIRMED',
          bookingStartsAt: { gte: startMonthUtc, lte: endMonthUtc },
        },
        _sum: { priceCentsAtBooking: true },
      }),
      prisma.booking.groupBy({
        by: ['serviceId'],
        where: {
          status: { in: ['CONFIRMED', 'COMPLETED'] },
          bookingStartsAt: { gte: thirtyDaysAgo },
        },
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 3,
      }),
      prisma.booking.findMany({
        where: { status: 'CONFIRMED', bookingStartsAt: { gte: now } },
        include: { service: true },
        orderBy: { bookingStartsAt: 'asc' },
        take: 5,
      }),
    ]);

  const serviceIds = topServices.map((t) => t.serviceId);
  const services =
    serviceIds.length > 0
      ? await prisma.service.findMany({
          where: { id: { in: serviceIds } },
          select: { id: true, name: true },
        })
      : [];

  const topWithNames = topServices.map((t) => ({
    count: t._count.id,
    name: services.find((s) => s.id === t.serviceId)?.name ?? 'Inconnu',
  }));

  const monthCA = monthlyRevenue._sum.priceCentsAtBooking ?? 0;

  return (
    <div className="space-y-10">
      <h1 className="text-2xl font-semibold">Tableau de bord</h1>

      {/* ── Cartes statistiques ── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="RDV à venir"
          value={upcomingCount}
          href="/admin/reservations?status=CONFIRMED"
          description="Confirmés, à venir"
        />
        <StatCard
          title="En attente"
          value={pendingCount}
          href="/admin/reservations?status=PENDING"
          description="Demandes à traiter"
          highlight={pendingCount > 0}
        />
        <StatCard
          title="CA ce mois"
          value={formatPrice(monthCA)}
          description="Bookings confirmés (prévisionnels)"
        />
        <div className="rounded-xl border p-5 space-y-3">
          <p className="text-sm text-muted-foreground font-medium">Top prestations (30 j)</p>
          {topWithNames.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucune donnée</p>
          ) : (
            <ol className="space-y-1">
              {topWithNames.map((s, i) => (
                <li key={i} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    {i + 1}. {s.name}
                  </span>
                  <span className="font-medium">{s.count} RDV</span>
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>

      {/* ── Prochains RDV ── */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium">Prochains rendez-vous</h2>
          <Link
            href="/admin/reservations?status=CONFIRMED"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            Voir tous →
          </Link>
        </div>

        {nextBookings.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucun rendez-vous à venir.</p>
        ) : (
          <div className="rounded-xl border divide-y">
            {nextBookings.map((b) => (
              <Link
                key={b.id}
                href={`/admin/reservations/${b.id}`}
                className="flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors"
              >
                <div className="space-y-0.5">
                  <p className="text-sm font-medium">
                    {b.customerFirstName}
                  </p>
                  <p className="text-xs text-muted-foreground">{b.service.name}</p>
                </div>
                <p className="text-sm text-muted-foreground capitalize">
                  {formatParis(b.bookingStartsAt, "EEE d MMM 'à' HH'h'mm")}
                </p>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function StatCard({
  title,
  value,
  description,
  href,
  highlight,
}: {
  title: string;
  value: string | number;
  description?: string;
  href?: string;
  highlight?: boolean;
}) {
  const inner = (
    <div className="space-y-2">
      <p className="text-sm text-muted-foreground font-medium">{title}</p>
      <p className={`text-3xl font-bold ${highlight ? 'text-amber-600' : ''}`}>{value}</p>
      {description && <p className="text-xs text-muted-foreground">{description}</p>}
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="rounded-xl border p-5 hover:bg-muted/30 transition-colors block">
        {inner}
      </Link>
    );
  }

  return <div className="rounded-xl border p-5">{inner}</div>;
}
