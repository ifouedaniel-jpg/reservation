import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { formatParis } from '@/lib/time';
import { cn } from '@/lib/utils';
import BookingStatusBadge from '@/components/booking/BookingStatusBadge';
import BookingActions from '@/components/admin/BookingActions';
import NotificationActions from '@/components/admin/NotificationActions';
import AnonymizeButton from '@/components/admin/AnonymizeButton';

type Props = { params: Promise<{ id: string }> };

const CHANNEL_LABELS: Record<string, string> = {
  WHATSAPP: 'WhatsApp',
  INSTAGRAM: 'Instagram',
  SMS: 'SMS',
  EMAIL: 'Email',
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
  MANUAL_REQUIRED: 'bg-amber-100 text-amber-800',
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
      timeSlot: true,
      notifications: { orderBy: { sentAt: 'desc' } },
    },
  });

  if (!booking) notFound();

  const slotDate = formatParis(booking.timeSlot.startsAt, 'EEEE d MMMM yyyy');
  const slotTime = formatParis(booking.timeSlot.startsAt, "HH'h'mm");

  return (
    <div className="space-y-8 max-w-2xl">
      {/* En-tête */}
      <div>
        <Link
          href="/admin/reservations"
          className="text-sm text-muted-foreground hover:text-foreground mb-4 inline-block"
        >
          ← Retour aux réservations
        </Link>
        <div className="flex items-center gap-3 mt-1">
          <h1 className="text-2xl font-semibold">
            {booking.customerFirstName} {booking.customerLastName}
          </h1>
          <BookingStatusBadge status={booking.status} />
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          Réf. <span className="font-mono">{booking.publicCode}</span>
          {' · '}
          Créée le {formatParis(booking.createdAt, 'd MMM yyyy à HH:mm')}
        </p>
      </div>

      {/* Actions */}
      <BookingActions bookingId={booking.id} status={booking.status} />

      {/* Anonymisation RGPD */}
      {booking.customerFirstName !== '[supprimé]' && (
        <AnonymizeButton bookingId={booking.id} />
      )}

      {/* Créneau & Prestation */}
      <section className="space-y-2">
        <h2 className="text-base font-medium">Rendez-vous</h2>
        <div className="rounded-xl border divide-y text-sm">
          <Row label="Prestation" value={booking.service.name} />
          <Row label="Date" value={<span className="capitalize">{slotDate}</span>} />
          <Row label="Heure" value={slotTime} />
          <Row label="Durée" value={formatDuration(booking.service.durationMinutes)} />
          <Row label="Tarif" value={formatPrice(booking.priceCentsAtBooking)} />
        </div>
      </section>

      {/* Infos cliente */}
      <section className="space-y-2">
        <h2 className="text-base font-medium">Cliente</h2>
        <div className="rounded-xl border divide-y text-sm">
          <Row
            label="Nom"
            value={`${booking.customerFirstName} ${booking.customerLastName}`}
          />
          <Row label="Téléphone" value={booking.customerPhone} />
          {booking.customerEmail && <Row label="Email" value={booking.customerEmail} />}
          {booking.customerInstagram && (
            <Row label="Instagram" value={`@${booking.customerInstagram}`} />
          )}
          <Row
            label="Canal préféré"
            value={CHANNEL_LABELS[booking.preferredChannel] ?? booking.preferredChannel}
          />
          {booking.notes && <Row label="Notes" value={booking.notes} />}
        </div>
      </section>

      {/* Historique de statut */}
      {(booking.confirmedAt || booking.cancelledAt) && (
        <section className="space-y-2">
          <h2 className="text-base font-medium">Historique</h2>
          <div className="rounded-xl border divide-y text-sm">
            {booking.confirmedAt && (
              <Row
                label="Confirmée le"
                value={formatParis(booking.confirmedAt, 'd MMM yyyy à HH:mm')}
              />
            )}
            {booking.cancelledAt && (
              <Row
                label="Annulée le"
                value={formatParis(booking.cancelledAt, 'd MMM yyyy à HH:mm')}
              />
            )}
            {booking.cancellationReason && (
              <Row label="Motif" value={booking.cancellationReason} />
            )}
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
                  <th className="px-4 py-2 text-left font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {booking.notifications.map((n) => {
                  let link: string | undefined;
                  let message: string | undefined;
                  if (n.status === 'MANUAL_REQUIRED') {
                    try {
                      const p = JSON.parse(n.payload) as { link?: string; message?: string };
                      link = p.link;
                      message = p.message;
                    } catch {
                      // payload non parseable
                    }
                  }
                  return (
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
                      <td className="px-4 py-2">
                        {n.status === 'MANUAL_REQUIRED' && (
                          <NotificationActions
                            notificationId={n.id}
                            bookingId={booking.id}
                            channel={n.channel}
                            link={link}
                            message={message}
                          />
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
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
