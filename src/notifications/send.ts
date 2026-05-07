import React from 'react';
import { prisma } from '@/lib/db';
import { sendEmail } from './email';
import { buildWhatsappLink } from './whatsapp';
import { buildInstagramLink } from './instagram';
import { buildNotificationContent, type NotificationType, type BookingSnapshot } from './messages';
import BookingReceived from './templates/BookingReceived';
import BookingConfirmed from './templates/BookingConfirmed';
import BookingRejected from './templates/BookingRejected';
import BookingCancelled from './templates/BookingCancelled';

function getEmailTemplate(
  type: NotificationType,
  booking: BookingSnapshot
): React.ReactElement {
  switch (type) {
    case 'BOOKING_RECEIVED':
      return React.createElement(BookingReceived, { booking });
    case 'BOOKING_CONFIRMED':
      return React.createElement(BookingConfirmed, { booking });
    case 'BOOKING_REJECTED':
      return React.createElement(BookingRejected, { booking });
    case 'BOOKING_CANCELLED':
      return React.createElement(BookingCancelled, { booking });
  }
}

export async function dispatch(bookingId: string, type: NotificationType): Promise<void> {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { service: true, timeSlot: true },
  });

  if (!booking) {
    console.error(`[dispatch] booking ${bookingId} introuvable`);
    return;
  }

  const { subject, text } = buildNotificationContent(type, booking);
  const channel = booking.preferredChannel;

  let status: string;
  let payload: string;
  let error: string | null = null;

  try {
    if (channel === 'EMAIL') {
      if (!booking.customerEmail) {
        status = 'FAILED';
        error = 'Aucun email renseigné';
        payload = '{}';
      } else {
        const result = await sendEmail({
          to: booking.customerEmail,
          subject,
          react: getEmailTemplate(type, booking),
        });
        if (result.error) {
          status = 'FAILED';
          error = result.error.message;
          payload = '{}';
        } else {
          status = 'SENT';
          payload = JSON.stringify({ emailId: result.data?.id });
        }
      }
    } else if (channel === 'WHATSAPP') {
      const link = buildWhatsappLink(booking.customerPhone, text);
      status = 'MANUAL_REQUIRED';
      payload = JSON.stringify({ link, message: text });
    } else if (channel === 'INSTAGRAM') {
      if (!booking.customerInstagram) {
        status = 'FAILED';
        error = 'Aucun compte Instagram renseigné';
        payload = '{}';
      } else {
        const link = buildInstagramLink(booking.customerInstagram);
        status = 'MANUAL_REQUIRED';
        payload = JSON.stringify({ link, message: text });
      }
    } else if (channel === 'SMS') {
      // T3.1 : intégration Brevo
      status = 'MANUAL_REQUIRED';
      payload = JSON.stringify({ message: text });
    } else {
      status = 'FAILED';
      error = `Canal inconnu : ${channel}`;
      payload = '{}';
    }
  } catch (err) {
    status = 'FAILED';
    error = err instanceof Error ? err.message : String(err);
    payload = '{}';
  }

  await prisma.notificationLog.create({
    data: { bookingId, channel, type, status, payload, error },
  });
}
