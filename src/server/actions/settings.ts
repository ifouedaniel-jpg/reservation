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

// ── Infos tunnel de réservation ────────────────────────────────────────────────

import { BOOKING_INFO_DEFAULTS } from '@/lib/bookingInfoDefaults';

export async function getBookingInfos(): Promise<{ meches: string; acompte: string; cheveux: string }> {
  const [meches, acompte, cheveux] = await Promise.all([
    getSetting('info_booking_meches'),
    getSetting('info_booking_acompte'),
    getSetting('info_booking_cheveux'),
  ]);
  return {
    meches: meches ?? BOOKING_INFO_DEFAULTS.meches,
    acompte: acompte ?? BOOKING_INFO_DEFAULTS.acompte,
    cheveux: cheveux ?? BOOKING_INFO_DEFAULTS.cheveux,
  };
}

const bookingInfoSchema = z.object({
  meches: z.string().max(2000),
  acompte: z.string().max(2000),
  cheveux: z.string().max(2000),
});

export async function updateBookingInfos(raw: z.infer<typeof bookingInfoSchema>): Promise<SettingsResult> {
  await requireAdmin();
  const parsed = bookingInfoSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Données invalides' };
  await Promise.all([
    setSetting('info_booking_meches', parsed.data.meches),
    setSetting('info_booking_acompte', parsed.data.acompte),
    setSetting('info_booking_cheveux', parsed.data.cheveux),
  ]);
  revalidatePath('/admin/parametres');
  revalidatePath('/reserver', 'layout');
  return { ok: true };
}
