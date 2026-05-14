'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireAdmin } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { uploadImage, deleteImage } from '@/lib/cloudinary';

const productSchema = z.object({
  name: z.string().min(1, 'Nom requis'),
  description: z.string().max(500).optional(),
  priceCents: z.number().int().min(1, 'Prix requis'),
  sortOrder: z.number().int().default(0),
  active: z.boolean().default(true),
});

type Result = { ok: true } | { ok: false; error: string };

export async function createProductAction(
  data: z.infer<typeof productSchema>,
  imageFormData?: FormData
): Promise<Result> {
  await requireAdmin();
  const parsed = productSchema.safeParse(data);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Données invalides' };

  let imageUrl: string | undefined;
  if (imageFormData) {
    const file = imageFormData.get('image') as File | null;
    if (file && file.size > 0) {
      const buffer = Buffer.from(await file.arrayBuffer());
      const { url } = await uploadImage(buffer, 'products');
      imageUrl = url;
    }
  }

  await prisma.product.create({ data: { ...parsed.data, imageUrl } });
  revalidatePath('/admin/produits');
  revalidatePath('/produits');
  return { ok: true };
}

export async function updateProductAction(
  id: string,
  data: z.infer<typeof productSchema>,
  imageFormData?: FormData
): Promise<Result> {
  await requireAdmin();
  const parsed = productSchema.safeParse(data);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Données invalides' };

  let imageUrl: string | undefined;
  if (imageFormData) {
    const file = imageFormData.get('image') as File | null;
    if (file && file.size > 0) {
      const buffer = Buffer.from(await file.arrayBuffer());
      const { url } = await uploadImage(buffer, 'products');
      imageUrl = url;
    }
  }

  await prisma.product.update({
    where: { id },
    data: { ...parsed.data, ...(imageUrl ? { imageUrl } : {}) },
  });
  revalidatePath('/admin/produits');
  revalidatePath('/produits');
  return { ok: true };
}

export async function toggleProductAction(id: string): Promise<Result> {
  await requireAdmin();
  const product = await prisma.product.findUnique({ where: { id } });
  if (!product) return { ok: false, error: 'Produit introuvable' };
  await prisma.product.update({ where: { id }, data: { active: !product.active } });
  revalidatePath('/admin/produits');
  revalidatePath('/produits');
  return { ok: true };
}

export async function deleteProductAction(id: string): Promise<Result> {
  await requireAdmin();
  const product = await prisma.product.findUnique({ where: { id } });
  if (!product) return { ok: false, error: 'Produit introuvable' };
  if (product.imageUrl) {
    const publicId = product.imageUrl.split('/').slice(-2).join('/').replace(/\.[^.]+$/, '');
    await deleteImage(publicId).catch(() => {});
  }
  await prisma.product.delete({ where: { id } });
  revalidatePath('/admin/produits');
  revalidatePath('/produits');
  return { ok: true };
}
