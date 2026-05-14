import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { formatParis } from '@/lib/time';
import { cn } from '@/lib/utils';
import BookingStatusBadge from '@/components/booking/BookingStatusBadge';
import BookingActions from '@/components/admin/BookingActions';

type Props = { params: Promise<{ id: string }> };

const CHANNEL_LABELS: Record<string, string> = {
  WHATSAPP: 'WhatsApp',
  INSTAGRAM: 'Instagram',
  SMS: 'SMS',
};

const NOTIF_TYPE_LABELS: Record<string, string> = {
  BOOKING_RECEIVED: 'Réservation reçue',
  BOOKING_CONFIRMED: 'Réservation confirmée',
  BOOKING_REJECTED: 'Réservation refusée',
  BOOKING_CANCELLED: 'Réservation annulée',
  REMINDER_24H: 'Rappel 24h',
};

const NOTIF_STATUS_STYLES: Record<string, string> = {
  SENT: 'bg-green-100 text-green-800',
  FAILED: 'bg-red-100 text-red-800',
};

function formatPrice(cents: number) {
  return (cents / 100).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' });
}

function formatDuration(minutes: number) {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h} h ${m.toString().padStart(2, '0')}` : `${h} h`;
}

export default async function AdminReservationDetailPage({ params }: Props) {
  await requireAdmin();

  const { id } = await params;

  const booking = await prisma.booking.findUnique({
    where: { id },
    include: {
      service: true,
      notifications: { orderBy: { sentAt: 'desc' } },
      products: { include: { product: true } },
    },
  });

  if (!booking) notFound();

  const slotDate = formatParis(booking.bookingStartsAt, 'EEEE d MMMM yyyy');
  const slotTime = `${formatParis(booking.bookingStartsAt, "HH'h'mm")} – ${formatParis(booking.bookingEndsAt, "HH'h'mm")}`;

  return (
    <div className="max-w-5xl space-y-6">
      {/* En-tête — pleine largeur */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <Link
            href="/admin/reservations"
            className="text-sm text-muted-foreground hover:text-foreground mb-4 inline-block"
          >
            ← Retour aux réservations
          </Link>
          <div className="flex items-center gap-3 mt-1 flex-wrap">
            <h1 className="text-2xl font-semibold">{booking.customerFirstName}</h1>
            <BookingStatusBadge status={booking.status} />
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Réf. <span className="font-mono">{booking.publicCode}</span>
            {' · '}
            Créée le {formatParis(booking.createdAt, 'd MMM yyyy à HH:mm')}
          </p>
        </div>
        {['PENDING', 'CONFIRMED'].includes(booking.status) && (
          <div className="shrink-0 pt-7">
            <BookingActions bookingId={booking.id} status={booking.status} />
          </div>
        )}
      </div>

      {/* Grille 2 colonnes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">

        {/* ── Colonne gauche : infos RDV & cliente ── */}
        <div className="space-y-6">

          {/* Créneau & Prestation */}
          <section className="space-y-2">
            <h2 className="text-base font-medium">Rendez-vous</h2>
            <div className="rounded-xl border divide-y text-sm">
              <Row label="Prestation" value={booking.service.name} />
              <Row label="Date" value={<span className="capitalize">{slotDate}</span>} />
              <Row label="Horaire" value={slotTime} />
              <Row label="Durée" value={formatDuration(booking.service.durationMinutes)} />
              <Row label="Tarif" value={formatPrice(booking.priceCentsAtBooking)} />
            </div>
          </section>

          {/* Infos cliente */}
          <section className="space-y-2">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-medium">Cliente</h2>
              {booking.customerPhone !== '[supprimé]' && (
                <a
                  href={`https://wa.me/${booking.customerPhone.replace(/^\+/, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#25D366] hover:bg-[#1ebe5d] px-3 py-1.5 text-xs font-semibold text-white transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                  Ouvrir WhatsApp
                </a>
              )}
            </div>
            <div className="rounded-xl border divide-y text-sm">
              <Row label="Prénom" value={booking.customerFirstName} />
              <Row label="Téléphone" value={booking.customerPhone} />
              {booking.notes && <Row label="Notes" value={booking.notes} />}
            </div>
          </section>

        </div>

        {/* ── Colonne droite : actions, paiement, notifications ── */}
        <div className="space-y-6">

          {/* Paiement */}
          {(booking.paymentReference || booking.paymentProofUrl) && (
            <section className="space-y-2">
              <h2 className="text-base font-medium">Paiement</h2>
              <div className="rounded-xl border divide-y text-sm">
                {booking.paymentReference && (
                  <Row label="Référence" value={<span className="font-mono">{booking.paymentReference}</span>} />
                )}
                {booking.paymentProofUrl && (
                  <div className="flex items-start justify-between gap-4 px-4 py-3">
                    <span className="text-muted-foreground shrink-0">Capture</span>
                    <a
                      href={booking.paymentProofUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block max-w-[220px]"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={booking.paymentProofUrl}
                        alt="Capture de paiement"
                        className="rounded-lg border object-cover w-full hover:opacity-90 transition-opacity"
                      />
                    </a>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* Produits commandés */}
          {booking.products.length > 0 && (
            <section className="space-y-2">
              <h2 className="text-base font-medium">Produits commandés</h2>
              <div className="rounded-xl border divide-y text-sm">
                {booking.products.map((bp) => (
                  <div key={bp.id} className="flex items-center justify-between gap-4 px-4 py-3">
                    <span className="font-medium">{bp.product.name} × {bp.quantity}</span>
                    <span className="text-muted-foreground">{formatPrice(bp.priceCentsAtBooking * bp.quantity)}</span>
                  </div>
                ))}
                <div className="flex items-center justify-between gap-4 px-4 py-3 font-semibold">
                  <span>Total produits</span>
                  <span>{formatPrice(booking.products.reduce((s, bp) => s + bp.priceCentsAtBooking * bp.quantity, 0))}</span>
                </div>
              </div>
            </section>
          )}

          {/* Notifications */}
          <section className="space-y-2">
            <h2 className="text-base font-medium">Notifications</h2>
            {booking.notifications.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucune notification envoyée.</p>
            ) : (
              <div className="overflow-x-auto rounded-xl border">
                <table className="min-w-full text-sm">
                  <thead className="border-b bg-muted/40">
                    <tr>
                      <th className="px-4 py-2 text-left font-medium">Type</th>
                      <th className="px-4 py-2 text-left font-medium">Canal</th>
                      <th className="px-4 py-2 text-left font-medium">Statut</th>
                      <th className="px-4 py-2 text-left font-medium">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {booking.notifications.map((n) => (
                      <tr key={n.id}>
                        <td className="px-4 py-2">{NOTIF_TYPE_LABELS[n.type] ?? n.type}</td>
                        <td className="px-4 py-2">{CHANNEL_LABELS[n.channel] ?? n.channel}</td>
                        <td className="px-4 py-2">
                          <span
                            className={cn(
                              'inline-flex rounded-full px-2 py-0.5 text-xs font-medium',
                              NOTIF_STATUS_STYLES[n.status] ?? 'bg-gray-100 text-gray-600'
                            )}
                          >
                            {n.status}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-muted-foreground whitespace-nowrap">
                          {formatParis(n.sentAt, 'd MMM HH:mm')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 px-4 py-3">
      <span className="text-muted-foreground shrink-0">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}
