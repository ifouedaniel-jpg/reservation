'use server';

import { bookingInputSchema, type BookingInput } from '@/schemas/booking';
import { createBooking, BookingError } from '@/lib/booking';

type SubmitResult =
  | { ok: true; data: { publicCode: string } }
  | { ok: false; error: string };

export async function submitBooking(input: BookingInput): Promise<SubmitResult> {
  const parsed = bookingInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: 'Données invalides. Veuillez vérifier le formulaire.' };
  }

  try {
    const booking = await createBooking(parsed.data);

    // TODO (T1.10): déclencher la notification BOOKING_RECEIVED
    console.log('[notifications] BOOKING_RECEIVED pour booking', booking.id);

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
