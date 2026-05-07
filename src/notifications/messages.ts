import { formatParis } from '@/lib/time';

export type BookingSnapshot = {
  customerFirstName: string;
  service: { name: string; durationMinutes: number };
  timeSlot: { startsAt: Date };
  publicCode: string;
  priceCentsAtBooking: number;
};

export type NotificationType =
  | 'BOOKING_RECEIVED'
  | 'BOOKING_CONFIRMED'
  | 'BOOKING_REJECTED'
  | 'BOOKING_CANCELLED';

function fmtDate(date: Date): string {
  return formatParis(date, "EEEE d MMMM yyyy 'à' HH'h'mm");
}

function fmtPrice(cents: number): string {
  return (cents / 100).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' });
}

function vars(booking: BookingSnapshot) {
  return {
    firstName: booking.customerFirstName,
    service: booking.service.name,
    date: fmtDate(booking.timeSlot.startsAt),
    price: fmtPrice(booking.priceCentsAtBooking),
    address: process.env.NEXT_PUBLIC_BUSINESS_ADDRESS ?? 'notre salon',
    siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000',
    trackingUrl: `${process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'}/ma-reservation/${booking.publicCode}`,
  };
}

export function buildNotificationContent(
  type: NotificationType,
  booking: BookingSnapshot
): { subject: string; text: string } {
  const v = vars(booking);

  switch (type) {
    case 'BOOKING_RECEIVED':
      return {
        subject: `Demande reçue — ${v.service}`,
        text: `Bonjour ${v.firstName} !\n\nNous avons bien reçu votre demande pour *${v.service}* le ${v.date}.\n\nElle est en cours de validation — vous serez contacté(e) très bientôt.\n\nTarif prévu : ${v.price}\nSuivre votre réservation : ${v.trackingUrl}`,
      };
    case 'BOOKING_CONFIRMED':
      return {
        subject: `Réservation confirmée — ${v.service} ✓`,
        text: `Bonjour ${v.firstName} !\n\nVotre réservation pour *${v.service}* le ${v.date} est confirmée ✓\n\nRendez-vous à ${v.address}. Le règlement (${v.price}) s'effectue sur place.\n\nSuivre votre réservation : ${v.trackingUrl}`,
      };
    case 'BOOKING_REJECTED':
      return {
        subject: `Demande non confirmée — ${v.service}`,
        text: `Bonjour ${v.firstName},\n\nNous n'avons malheureusement pas pu confirmer votre demande pour *${v.service}* le ${v.date}.\n\nN'hésitez pas à choisir un autre créneau : ${v.siteUrl}/prestations`,
      };
    case 'BOOKING_CANCELLED':
      return {
        subject: `Réservation annulée — ${v.service}`,
        text: `Bonjour ${v.firstName},\n\nVotre réservation pour *${v.service}* le ${v.date} a été annulée.\n\nN'hésitez pas à reprendre rendez-vous : ${v.siteUrl}/prestations`,
      };
  }
}
