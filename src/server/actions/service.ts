'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { uploadImage, deleteImage } from '@/lib/cloudinary';
import { serviceInputSchema } from '@/schemas/service';

type ActionState = { ok: false; error: string } | null;

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function revalidateServicePaths() {
  revalidatePath('/admin/prestations');
  revalidatePath('/prestations');
}

function parseServiceFormData(formData: FormData) {
  return {
    name: (formData.get('name') as string) ?? '',
    description: (formData.get('description') as string) ?? '',
    durationMinutes: Number(formData.get('durationMinutes')),
    priceCents: Math.round(parseFloat((formData.get('priceEuros') as string) ?? '0') * 100),
    active: formData.get('active') === 'on',
    sortOrder: Number(formData.get('sortOrder') || '0'),
  };
}

export async function createService(prevState: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();

  const rawData = parseServiceFormData(formData);
  const parsed = serviceInputSchema.safeParse(rawData);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Données invalides' };
  }

  let imageUrl: string | null = null;
  let imagePublicId: string | null = null;

  const imageFile = formData.get('image') as File | null;
  if (imageFile && imageFile.size > 0) {
    try {
      const buffer = Buffer.from(await imageFile.arrayBuffer());
      const result = await uploadImage(buffer, 'salon-booking/services');
      imageUrl = result.url;
      imagePublicId = result.publicId;
    } catch {
      return { ok: false, error: "Erreur lors de l'upload de l'image" };
    }
  }

  try {
    await prisma.service.create({
      data: {
        ...parsed.data,
        slug: generateSlug(parsed.data.name),
        imageUrl,
        imagePublicId,
      },
    });
  } catch (e) {
    if (imagePublicId) await deleteImage(imagePublicId).catch(() => {});
    if (e && typeof e === 'object' && 'code' in e && e.code === 'P2002') {
      return { ok: false, error: 'Une prestation avec ce nom existe déjà' };
    }
    return { ok: false, error: 'Erreur lors de la création de la prestation' };
  }

  revalidateServicePaths();
  redirect('/admin/prestations');
}

export async function updateService(
  id: string,
  prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();

  const rawData = parseServiceFormData(formData);
  const parsed = serviceInputSchema.safeParse(rawData);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Données invalides' };
  }

  const existing = await prisma.service.findUnique({
    where: { id },
    select: { imageUrl: true, imagePublicId: true },
  });
  if (!existing) return { ok: false, error: 'Prestation introuvable' };

  let imageUrl = existing.imageUrl;
  let imagePublicId = existing.imagePublicId;

  const imageFile = formData.get('image') as File | null;
  if (imageFile && imageFile.size > 0) {
    try {
      const buffer = Buffer.from(await imageFile.arrayBuffer());
      const result = await uploadImage(buffer, 'salon-booking/services');

      if (existing.imagePublicId) {
        await deleteImage(existing.imagePublicId).catch(() => {});
      }

      imageUrl = result.url;
      imagePublicId = result.publicId;
    } catch {
      return { ok: false, error: "Erreur lors de l'upload de l'image" };
    }
  }

  try {
    await prisma.service.update({
      where: { id },
      data: {
        ...parsed.data,
        slug: generateSlug(parsed.data.name),
        imageUrl,
        imagePublicId,
      },
    });
  } catch (e) {
    if (e && typeof e === 'object' && 'code' in e && e.code === 'P2002') {
      return { ok: false, error: 'Une prestation avec ce nom existe déjà' };
    }
    return { ok: false, error: 'Erreur lors de la mise à jour de la prestation' };
  }

  revalidateServicePaths();
  redirect('/admin/prestations');
}

export async function deleteService(id: string): Promise<{ ok: boolean; error?: string }> {
  await requireAdmin();

  const service = await prisma.service.findUnique({
    where: { id },
    select: { imagePublicId: true },
  });
  if (!service) return { ok: false, error: 'Prestation introuvable' };

  try {
    await prisma.service.delete({ where: { id } });
  } catch {
    return { ok: false, error: 'Erreur lors de la suppression' };
  }

  if (service.imagePublicId) {
    await deleteImage(service.imagePublicId).catch(() => {});
  }

  revalidateServicePaths();
  return { ok: true };
}

export async function toggleServiceActive(id: string): Promise<{ ok: boolean; error?: string }> {
  await requireAdmin();

  const service = await prisma.service.findUnique({
    where: { id },
    select: { active: true },
  });
  if (!service) return { ok: false, error: 'Prestation introuvable' };

  try {
    await prisma.service.update({
      where: { id },
      data: { active: !service.active },
    });
  } catch {
    return { ok: false, error: 'Erreur lors de la mise à jour' };
  }

  revalidateServicePaths();
  return { ok: true };
}
