'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { recurringAvailabilitySchema, blockedDateSchema } from '@/schemas/availability';

type ActionResult = { ok: true } | { ok: false; error: string };

function revalidate() {
  revalidatePath('/admin/disponibilites');
}

export async function createRecurring(
  _prevState: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  await requireAdmin();

  const parsed = recurringAvailabilitySchema.safeParse({
    dayOfWeek: formData.get('dayOfWeek'),
    startTime: formData.get('startTime'),
    endTime: formData.get('endTime'),
    slotMinutes: formData.get('slotMinutes'),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Données invalides' };
  }

  await prisma.recurringAvailability.create({ data: parsed.data });
  revalidate();
  return { ok: true };
}

export async function updateRecurring(
  id: string,
  _prevState: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  await requireAdmin();

  const parsed = recurringAvailabilitySchema.safeParse({
    dayOfWeek: formData.get('dayOfWeek'),
    startTime: formData.get('startTime'),
    endTime: formData.get('endTime'),
    slotMinutes: formData.get('slotMinutes'),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Données invalides' };
  }

  const existing = await prisma.recurringAvailability.findUnique({ where: { id } });
  if (!existing) return { ok: false, error: 'Règle introuvable' };

  await prisma.recurringAvailability.update({ where: { id }, data: parsed.data });
  revalidate();
  return { ok: true };
}

export async function deleteRecurring(id: string): Promise<ActionResult> {
  await requireAdmin();

  try {
    await prisma.recurringAvailability.delete({ where: { id } });
  } catch {
    return { ok: false, error: 'Erreur lors de la suppression' };
  }

  revalidate();
  return { ok: true };
}

export async function toggleRecurringActive(id: string): Promise<ActionResult> {
  await requireAdmin();

  const rule = await prisma.recurringAvailability.findUnique({ where: { id } });
  if (!rule) return { ok: false, error: 'Règle introuvable' };

  await prisma.recurringAvailability.update({ where: { id }, data: { active: !rule.active } });
  revalidate();
  return { ok: true };
}

export async function createBlockedDate(
  _prevState: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  await requireAdmin();

  const rawReason = formData.get('reason');
  const parsed = blockedDateSchema.safeParse({
    date: formData.get('date'),
    reason: rawReason && String(rawReason).trim() ? String(rawReason).trim() : undefined,
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Données invalides' };
  }

  await prisma.blockedDate.create({
    data: {
      date: new Date(parsed.data.date + 'T00:00:00.000Z'),
      reason: parsed.data.reason ?? null,
    },
  });
  revalidate();
  return { ok: true };
}

export async function deleteBlockedDate(id: string): Promise<ActionResult> {
  await requireAdmin();

  try {
    await prisma.blockedDate.delete({ where: { id } });
  } catch {
    return { ok: false, error: 'Erreur lors de la suppression' };
  }

  revalidate();
  return { ok: true };
}
