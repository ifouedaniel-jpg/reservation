'use server';

import { revalidatePath } from 'next/cache';
import { bookingInputSchema, type BookingInput } from '@/schemas/booking';
import {
  createBooking,
  confirmBooking,
  rejectBooking,
  cancelBooking,
  markCompleted,
  markNoShow,
  anonymizeBooking,
  BookingError,
  BookingTransitionError,
} from '@/lib/booking';
import { requireAdmin } from '@/lib/auth';
import { dispatch } from '@/notifications/send';
import type { NotificationType } from '@/notifications/messages';
import { uploadImage } from '@/lib/cloudinary';

type ActionResult = { ok: true } | { ok: false; error: string };

export type WhatsappData = { notificationId: string; link: string; message: string };
type ActionWithWhatsapp =
  | { ok: true; whatsapp: WhatsappData | null }
  | { ok: false; error: string };

type SubmitResult =
  | { ok: true; data: { publicCode: string } }
  | { ok: false; error: string };

type UploadResult = { ok: true; url: string } | { ok: false; error: string };

export async function uploadPaymentProof(formData: FormData): Promise<UploadResult> {
  const file = formData.get('file') as File | null;
  if (!file || file.size === 0) return { ok: false, error: 'Aucun fichier sélectionné' };
  if (file.size > 5 * 1024 * 1024) return { ok: false, error: 'Fichier trop volumineux (5 Mo max)' };
  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const { url } = await uploadImage(buffer, 'payment-proofs');
    return { ok: true, url };
  } catch (err) {
    console.error('[uploadPaymentProof]', err);
    return { ok: false, error: 'Erreur lors de l\'upload. Veuillez réessayer.' };
  }
}

export async function submitBooking(input: BookingInput): Promise<SubmitResult> {
  const parsed = bookingInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: 'Données invalides. Veuillez vérifier le formulaire.' };
  }

  try {
    const booking = await createBooking(parsed.data);
    await notify(booking.id, 'BOOKING_RECEIVED');
    return { ok: true, data: { publicCode: booking.publicCode } };
  } catch (err) {
    if (err instanceof BookingError) {
      if (err.code === 'SLOT_NOT_AVAILABLE') {
        return { ok: false, error: 'Ce créneau n\'est plus disponible. Veuillez en choisir un autre.' };
      }
      if (err.code === 'SERVICE_NOT_FOUND') {
        return { ok: false, error: 'Prestation introuvable ou inactive.' };
      }
    }
    console.error('[submitBooking] erreur inattendue', err);
    return { ok: false, error: 'Une erreur est survenue. Veuillez réessayer.' };
  }
}

// ── Actions admin ──────────────────────────────────────────────────────────────

function handleTransitionError(err: unknown, action: string): ActionResult {
  if (err instanceof BookingTransitionError) {
    if (err.code === 'BOOKING_NOT_FOUND') return { ok: false, error: 'Réservation introuvable.' };
    if (err.code === 'INVALID_TRANSITION') return { ok: false, error: 'Transition de statut non autorisée.' };
  }
  console.error(`[${action}] erreur inattendue`, err);
  return { ok: false, error: 'Une erreur est survenue.' };
}

function revalidateBooking(id: string) {
  revalidatePath('/admin/reservations');
  revalidatePath(`/admin/reservations/${id}`);
  revalidatePath('/ma-reservation', 'layout');
}

async function notify(bookingId: string, type: NotificationType): Promise<WhatsappData | null> {
  try {
    const result = await dispatch(bookingId, type);
    if (result && result.link) {
      return { notificationId: result.notificationId, link: result.link, message: result.message ?? '' };
    }
    return null;
  } catch (err) {
    console.error(`[notifications] dispatch ${type} failed`, err);
    return null;
  }
}

export async function confirmBookingAction(id: string): Promise<ActionWithWhatsapp> {
  await requireAdmin();
  try {
    await confirmBooking(id);
    const whatsapp = await notify(id, 'BOOKING_CONFIRMED');
    revalidateBooking(id);
    return { ok: true, whatsapp };
  } catch (err) {
    const { error } = handleTransitionError(err, 'confirmBookingAction') as { ok: false; error: string };
    return { ok: false, error };
  }
}

export async function rejectBookingAction(id: string, reason?: string): Promise<ActionWithWhatsapp> {
  await requireAdmin();
  try {
    await rejectBooking(id, reason);
    const whatsapp = await notify(id, 'BOOKING_REJECTED');
    revalidateBooking(id);
    return { ok: true, whatsapp };
  } catch (err) {
    const { error } = handleTransitionError(err, 'rejectBookingAction') as { ok: false; error: string };
    return { ok: false, error };
  }
}

export async function cancelBookingAction(id: string, reason?: string): Promise<ActionResult> {
  await requireAdmin();
  try {
    await cancelBooking(id, reason);
    await notify(id, 'BOOKING_CANCELLED');
    revalidateBooking(id);
    return { ok: true };
  } catch (err) {
    return handleTransitionError(err, 'cancelBookingAction');
  }
}

export async function markCompletedAction(id: string): Promise<ActionResult> {
  await requireAdmin();
  try {
    await markCompleted(id);
    revalidateBooking(id);
    return { ok: true };
  } catch (err) {
    return handleTransitionError(err, 'markCompletedAction');
  }
}

export async function markNoShowAction(id: string): Promise<ActionResult> {
  await requireAdmin();
  try {
    await markNoShow(id);
    revalidateBooking(id);
    return { ok: true };
  } catch (err) {
    return handleTransitionError(err, 'markNoShowAction');
  }
}

export async function anonymizeBookingAction(id: string): Promise<ActionResult> {
  await requireAdmin();
  try {
    await anonymizeBooking(id);
    revalidateBooking(id);
    return { ok: true };
  } catch (err) {
    return handleTransitionError(err, 'anonymizeBookingAction');
  }
}
