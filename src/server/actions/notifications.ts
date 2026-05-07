'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';

type ActionResult = { ok: true } | { ok: false; error: string };

export async function markNotificationSentAction(
  notificationId: string,
  bookingId: string
): Promise<ActionResult> {
  await requireAdmin();
  try {
    await prisma.notificationLog.update({
      where: { id: notificationId },
      data: { status: 'SENT' },
    });
    revalidatePath(`/admin/reservations/${bookingId}`);
    return { ok: true };
  } catch {
    return { ok: false, error: 'Impossible de mettre à jour la notification.' };
  }
}
