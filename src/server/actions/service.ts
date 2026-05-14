'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { uploadImage, deleteImage } from '@/lib/cloudinary';
import { serviceInputSchema } from '@/schemas/service';
import { parsePriceMatrix } from '@/schemas/priceMatrix';

type ActionState = { ok: false; error: string } | null;

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function revalidateServicePaths(slug?: string) {
  revalidatePath('/admin/prestations');
  revalidatePath('/prestations');
  if (slug) revalidatePath(`/prestations/${slug}`);
}

function parseServiceFormData(formData: FormData) {
  const priceMatrixRaw = ((formData.get('priceMatrix') as string) ?? '').trim();
  const extensionRaw = ((formData.get('priceWithExtensionEuros') as string) ?? '').trim();
  const extensionCents = extensionRaw ? Math.round(parseFloat(extensionRaw) * 100) : null;
  return {
    name: (formData.get('name') as string) ?? '',
    description: (formData.get('description') as string) ?? '',
    durationMinutes: Number(formData.get('durationMinutes')),
    priceCents: Math.round(parseFloat((formData.get('priceEuros') as string) ?? '0') * 100),
    priceWithExtensionCents: extensionCents && extensionCents > 0 ? extensionCents : null,
    active: formData.get('active') === 'on',
    sortOrder: Number(formData.get('sortOrder') || '0'),
    priceMatrix: priceMatrixRaw || null,
  };
}

function validatePriceMatrix(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const matrix = parsePriceMatrix(raw);
  if (!matrix) return 'JSON de grille de tarifs invalide';
  return null;
}

async function uploadImageFiles(files: File[]): Promise<{ url: string; publicId: string }[]> {
  const results: { url: string; publicId: string }[] = [];
  for (const file of files) {
    if (file.size === 0) continue;
    const buffer = Buffer.from(await file.arrayBuffer());
    results.push(await uploadImage(buffer, 'salon-booking/services'));
  }
  return results;
}

// ── Create ─────────────────────────────────────────────────────────────────────

export async function createService(prevState: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();

  const rawData = parseServiceFormData(formData);
  const parsed = serviceInputSchema.safeParse(rawData);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Données invalides' };
  }

  const matrixError = validatePriceMatrix(rawData.priceMatrix);
  if (matrixError) return { ok: false, error: matrixError };

  const imageFiles = formData.getAll('images') as File[];
  let uploadedImages: { url: string; publicId: string }[] = [];

  try {
    uploadedImages = await uploadImageFiles(imageFiles);
  } catch {
    return { ok: false, error: "Erreur lors de l'upload des images" };
  }

  const slug = generateSlug(parsed.data.name);

  try {
    await prisma.service.create({
      data: {
        ...parsed.data,
        slug,
        priceMatrix: rawData.priceMatrix,
        images: {
          create: uploadedImages.map((img, i) => ({
            url: img.url,
            publicId: img.publicId,
            order: i,
          })),
        },
      },
    });
  } catch (e) {
    for (const img of uploadedImages) await deleteImage(img.publicId).catch(() => {});
    if (e && typeof e === 'object' && 'code' in e && e.code === 'P2002') {
      return { ok: false, error: 'Une prestation avec ce nom existe déjà' };
    }
    return { ok: false, error: 'Erreur lors de la création de la prestation' };
  }

  revalidateServicePaths(slug);
  redirect('/admin/prestations');
}

// ── Update ─────────────────────────────────────────────────────────────────────

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

  const matrixError = validatePriceMatrix(rawData.priceMatrix);
  if (matrixError) return { ok: false, error: matrixError };

  const existing = await prisma.service.findUnique({ where: { id }, select: { id: true } });
  if (!existing) return { ok: false, error: 'Prestation introuvable' };

  const imageFiles = formData.getAll('images') as File[];
  let uploadedImages: { url: string; publicId: string }[] = [];

  try {
    uploadedImages = await uploadImageFiles(imageFiles);
  } catch {
    return { ok: false, error: "Erreur lors de l'upload des images" };
  }

  const currentCount = await prisma.serviceImage.count({ where: { serviceId: id } });
  const slug = generateSlug(parsed.data.name);

  try {
    await prisma.service.update({
      where: { id },
      data: {
        ...parsed.data,
        slug,
        priceMatrix: rawData.priceMatrix,
        images: {
          create: uploadedImages.map((img, i) => ({
            url: img.url,
            publicId: img.publicId,
            order: currentCount + i,
          })),
        },
      },
    });
  } catch (e) {
    for (const img of uploadedImages) await deleteImage(img.publicId).catch(() => {});
    if (e && typeof e === 'object' && 'code' in e && e.code === 'P2002') {
      return { ok: false, error: 'Une prestation avec ce nom existe déjà' };
    }
    return { ok: false, error: 'Erreur lors de la mise à jour de la prestation' };
  }

  revalidateServicePaths(slug);
  redirect('/admin/prestations');
}

// ── Delete service ─────────────────────────────────────────────────────────────

export async function deleteService(id: string): Promise<{ ok: boolean; error?: string }> {
  await requireAdmin();

  const images = await prisma.serviceImage.findMany({
    where: { serviceId: id },
    select: { publicId: true },
  });

  try {
    await prisma.service.delete({ where: { id } });
  } catch {
    return { ok: false, error: 'Erreur lors de la suppression' };
  }

  for (const img of images) await deleteImage(img.publicId).catch(() => {});

  revalidateServicePaths();
  return { ok: true };
}

// ── Delete single image ────────────────────────────────────────────────────────

export async function deleteServiceImage(imageId: string): Promise<{ ok: boolean; error?: string }> {
  await requireAdmin();

  const image = await prisma.serviceImage.findUnique({
    where: { id: imageId },
    select: { publicId: true, serviceId: true, service: { select: { slug: true } } },
  });
  if (!image) return { ok: false, error: 'Image introuvable' };

  await prisma.serviceImage.delete({ where: { id: imageId } });
  await deleteImage(image.publicId).catch(() => {});

  revalidatePath('/admin/prestations');
  revalidatePath(`/admin/prestations/${image.serviceId}`);
  revalidatePath(`/prestations/${image.service.slug}`);
  return { ok: true };
}

// ── Toggle active ─────────────────────────────────────────────────────────────

export async function toggleServiceActive(id: string): Promise<{ ok: boolean; error?: string }> {
  await requireAdmin();

  const service = await prisma.service.findUnique({ where: { id }, select: { active: true } });
  if (!service) return { ok: false, error: 'Prestation introuvable' };

  try {
    await prisma.service.update({ where: { id }, data: { active: !service.active } });
  } catch {
    return { ok: false, error: 'Erreur lors de la mise à jour' };
  }

  revalidateServicePaths();
  return { ok: true };
}
