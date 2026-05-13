'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireAdmin } from '@/lib/auth';
import { getSetting, setSetting } from '@/lib/settings';

const paypalSchema = z.object({
  paypalLink: z
    .string()
    .trim()
    .url('URL invalide')
    .refine((v) => v.startsWith('https://'), 'L\'URL doit commencer par https://')
    .or(z.literal('')),
});

type SettingsResult = { ok: true } | { ok: false; error: string };

export async function getPaypalLink(): Promise<string | null> {
  return getSetting('paypal_link');
}

export async function updatePaypalLink(raw: { paypalLink: string }): Promise<SettingsResult> {
  await requireAdmin();
  const parsed = paypalSchema.safeParse(raw);
  if (!parsed.success) {
    const issues = parsed.error.issues;
    return { ok: false, error: issues[0]?.message ?? 'URL invalide' };
  }
  await setSetting('paypal_link', parsed.data.paypalLink);
  revalidatePath('/admin/parametres');
  return { ok: true };
}
