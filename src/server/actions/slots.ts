'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { regenerateSlots } from '@/lib/slots';
import { parisToUtc, formatParis } from '@/lib/time';

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

export async function createManualSlot(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  await requireAdmin();

  const dateStr = String(formData.get('date') ?? '').trim();
  const startTime = String(formData.get('startTime') ?? '').trim();
  const endTime = String(formData.get('endTime') ?? '').trim();

  if (!dateStr || !startTime || !endTime) {
    return { ok: false, error: 'Date, heure de début et heure de fin requises' };
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return { ok: false, error: 'Format de date invalide' };
  }
  if (!/^\d{2}:\d{2}$/.test(startTime) || !/^\d{2}:\d{2}$/.test(endTime)) {
    return { ok: false, error: 'Format d\'heure invalide' };
  }
  if (endTime <= startTime) {
    return { ok: false, error: 'L\'heure de fin doit être après l\'heure de début' };
  }

  const startsAt = parisToUtc(`${dateStr}T${startTime}:00`);
  const endsAt = parisToUtc(`${dateStr}T${endTime}:00`);

  const overlapping = await prisma.timeSlot.findFirst({
    where: {
      AND: [
        { startsAt: { lt: endsAt } },
        { endsAt: { gt: startsAt } },
      ],
    },
  });
  if (overlapping) {
    const oStart = formatParis(overlapping.startsAt, 'HH:mm');
    const oEnd = formatParis(overlapping.endsAt, 'HH:mm');
    return { ok: false, error: `Ce créneau chevauche un créneau existant (${oStart}–${oEnd})` };
  }

  await prisma.timeSlot.create({ data: { startsAt, endsAt, status: 'OPEN' } });
  revalidatePath('/admin/disponibilites');
  return { ok: true };
}

export async function deleteSlot(id: string): Promise<ActionResult> {
  await requireAdmin();

  const slot = await prisma.timeSlot.findUnique({ where: { id } });
  if (!slot) return { ok: false, error: 'Créneau introuvable' };
  if (slot.status !== 'OPEN' && slot.status !== 'CLOSED') {
    return { ok: false, error: 'Impossible de supprimer un créneau réservé ou en attente' };
  }

  await prisma.timeSlot.delete({ where: { id } });
  revalidatePath('/admin/disponibilites');
  return { ok: true };
}

export async function updateSlot(
  id: string,
  dateStr: string,
  startTime: string,
  endTime: string,
): Promise<ActionResult> {
  await requireAdmin();

  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return { ok: false, error: 'Format de date invalide' };
  }
  if (!/^\d{2}:\d{2}$/.test(startTime) || !/^\d{2}:\d{2}$/.test(endTime)) {
    return { ok: false, error: "Format d'heure invalide" };
  }
  if (endTime <= startTime) {
    return { ok: false, error: "L'heure de fin doit être après l'heure de début" };
  }

  const slot = await prisma.timeSlot.findUnique({ where: { id } });
  if (!slot) return { ok: false, error: 'Créneau introuvable' };
  if (slot.status !== 'OPEN' && slot.status !== 'CLOSED') {
    return { ok: false, error: 'Impossible de modifier un créneau réservé ou en attente' };
  }

  const startsAt = parisToUtc(`${dateStr}T${startTime}:00`);
  const endsAt = parisToUtc(`${dateStr}T${endTime}:00`);

  const overlapping = await prisma.timeSlot.findFirst({
    where: {
      id: { not: id },
      AND: [
        { startsAt: { lt: endsAt } },
        { endsAt: { gt: startsAt } },
      ],
    },
  });
  if (overlapping) {
    const oStart = formatParis(overlapping.startsAt, 'HH:mm');
    const oEnd = formatParis(overlapping.endsAt, 'HH:mm');
    return { ok: false, error: `Ce créneau chevauche un créneau existant (${oStart}–${oEnd})` };
  }

  await prisma.timeSlot.update({ where: { id }, data: { startsAt, endsAt } });
  revalidatePath('/admin/disponibilites');
  return { ok: true };
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
