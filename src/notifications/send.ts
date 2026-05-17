import { prisma } from '@/lib/db';
import { getSetting } from '@/lib/settings';
import { buildWhatsappLink } from './whatsapp';
import { buildNotificationContent, DEFAULT_TEMPLATES, type NotificationType } from './messages';

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

  const [tplConfirmed, tplRejected, tplCancelled] = await Promise.all([
    getSetting('msg_tpl_confirmed'),
    getSetting('msg_tpl_rejected'),
    getSetting('msg_tpl_cancelled'),
  ]);
  const templates = {
    confirmed: tplConfirmed ?? DEFAULT_TEMPLATES.confirmed,
    rejected: tplRejected ?? DEFAULT_TEMPLATES.rejected,
    cancelled: tplCancelled ?? DEFAULT_TEMPLATES.cancelled,
  };

  const { text } = buildNotificationContent(type, booking, templates);

  let status: string;
  let payload: string;
  let channel: string;
  let link: string | null = null;
  let error: string | null = null;

  if (type === 'BOOKING_RECEIVED') {
    channel = 'WEB';
    status = 'SENT';
    payload = JSON.stringify({ message: text });
  } else {
    channel = 'WHATSAPP';
    try {
      link = buildWhatsappLink(booking.customerPhone, text);
      status = 'SENT';
      payload = JSON.stringify({ link, message: text });
    } catch (err) {
      status = 'FAILED';
      error = err instanceof Error ? err.message : String(err);
      payload = '{}';
    }
  }

  const log = await prisma.notificationLog.create({
    data: { bookingId, channel, type, status, payload, error },
  });

  return { notificationId: log.id, link, message: text };
}
