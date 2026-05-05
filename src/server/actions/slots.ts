'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { regenerateSlots } from '@/lib/slots';

type ActionResult = { ok: true; count?: number } | { ok: false; error: string };

export async function regenerateSlotsAction(): Promise<ActionResult> {
  await requireAdmin();
  try {
    const count = await regenerateSlots();
    revalidatePath('/admin/disponibilites');
    return { ok: true, count };
  } catch {
    return { ok: false, error: 'Erreur lors de la génération des créneaux' };
  }
}

export async function toggleSlotStatus(id: string): Promise<ActionResult> {
  await requireAdmin();

  const slot = await prisma.timeSlot.findUnique({ where: { id } });
  if (!slot) return { ok: false, error: 'Créneau introuvable' };
  if (slot.status !== 'OPEN' && slot.status !== 'CLOSED') {
    return { ok: false, error: 'Ce créneau ne peut pas être modifié manuellement' };
  }

  await prisma.timeSlot.update({
    where: { id },
    data: { status: slot.status === 'OPEN' ? 'CLOSED' : 'OPEN' },
  });

  revalidatePath('/admin/disponibilites');
  return { ok: true };
}
