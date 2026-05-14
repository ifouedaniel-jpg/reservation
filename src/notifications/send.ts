import { prisma } from '@/lib/db';
import { buildWhatsappLink } from './whatsapp';
import { buildNotificationContent, type NotificationType } from './messages';

export type DispatchResult = {
  notificationId: string;
  link: string | null;
  message: string | null;
};

export async function dispatch(bookingId: string, type: NotificationType): Promise<DispatchResult | null> {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { service: true },
  });

  if (!booking) {
    console.error(`[dispatch] booking ${bookingId} introuvable`);
    return null;
  }

  const { text } = buildNotificationContent(type, booking);

  let status: string;
  let payload: string;
  let link: string | null = null;
  let error: string | null = null;

  try {
    link = buildWhatsappLink(booking.customerPhone, text);
    status = 'SENT';
    payload = JSON.stringify({ link, message: text });
  } catch (err) {
    status = 'FAILED';
    error = err instanceof Error ? err.message : String(err);
    payload = '{}';
  }

  const log = await prisma.notificationLog.create({
    data: { bookingId, channel: 'WHATSAPP', type, status, payload, error },
  });

  return { notificationId: log.id, link, message: text };
}
