import { formatParis } from '@/lib/time';

export type BookingSnapshot = {
  customerFirstName: string;
  service: { name: string; durationMinutes: number };
  bookingStartsAt: Date;
  publicCode: string;
  priceCentsAtBooking: number;
};

export type NotificationType =
  | 'BOOKING_RECEIVED'
  | 'BOOKING_CONFIRMED'
  | 'BOOKING_REJECTED'
  | 'BOOKING_CANCELLED';

export type MessageTemplates = {
  confirmed: string;
  rejected: string;
  cancelled: string;
};

export const DEFAULT_TEMPLATES: MessageTemplates = {
  confirmed:
    `Bonjour {prenom} !\n\nVotre réservation pour *{service}* le {date} est confirmée ✓\n\nRendez-vous à {adresse}. Le règlement ({prix}) s'effectue sur place.`,
  rejected:
    `Bonjour {prenom},\n\nNous n'avons malheureusement pas pu confirmer votre demande pour *{service}* le {date}.\n\nN'hésitez pas à choisir un autre créneau.`,
  cancelled:
    `Bonjour {prenom},\n\nVotre réservation pour *{service}* le {date} a été annulée.\n\nVotre remboursement sera effectué via le même canal que votre paiement dans les meilleurs délais.\n\nN'hésitez pas à reprendre rendez-vous.`,
};

function fmtDate(date: Date): string {
  return formatParis(date, "EEEE d MMMM yyyy 'à' HH'h'mm");
}

function fmtPrice(cents: number): string {
  return (cents / 100).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' });
}

function interpolate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_, key) => vars[key] ?? `{${key}}`);
}

export function buildNotificationContent(
  type: NotificationType,
  booking: BookingSnapshot,
  templates?: Partial<MessageTemplates>
): { subject: string; text: string } {
  const vars: Record<string, string> = {
    prenom: booking.customerFirstName,
    service: booking.service.name,
    date: fmtDate(booking.bookingStartsAt),
    prix: fmtPrice(booking.priceCentsAtBooking),
    adresse: process.env.NEXT_PUBLIC_BUSINESS_ADDRESS ?? 'notre salon',
    siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000',
  };

  switch (type) {
    case 'BOOKING_RECEIVED':
      return {
        subject: `Demande reçue — ${vars.service}`,
        text: `Bonjour ${vars.prenom} !\n\nNous avons bien reçu votre demande pour *${vars.service}* le ${vars.date}.\n\nElle est en cours de validation — vous serez contacté(e) très bientôt.\n\nTarif prévu : ${vars.prix}`,
      };
    case 'BOOKING_CONFIRMED':
      return {
        subject: `Réservation confirmée — ${vars.service} ✓`,
        text: interpolate(templates?.confirmed ?? DEFAULT_TEMPLATES.confirmed, vars),
      };
    case 'BOOKING_REJECTED':
      return {
        subject: `Demande non confirmée — ${vars.service}`,
        text: interpolate(templates?.rejected ?? DEFAULT_TEMPLATES.rejected, vars),
      };
    case 'BOOKING_CANCELLED':
      return {
        subject: `Réservation annulée — ${vars.service}`,
        text: interpolate(templates?.cancelled ?? DEFAULT_TEMPLATES.cancelled, vars),
      };
  }
}
