import { z } from 'zod';

export const selectedProductSchema = z.object({
  productId: z.string().min(1),
  quantity: z.number().int().min(1).max(20),
});

export const bookingInputSchema = z
  .object({
    firstName: z.string().min(1, 'Prénom requis'),
    phone: z.string().regex(/^\+\d{10,15}$/, 'Numéro invalide (ex : +33612345678)'),
    notes: z.string().max(500, '500 caractères maximum').optional(),
    serviceId: z.string().min(1),
    timeSlotId: z.string().min(1),
    bookingStartsAt: z.string().datetime(),
    bookingEndsAt: z.string().datetime(),
    selectedOptionsJson: z.string().optional(),
    selectedProducts: z.array(selectedProductSchema).optional(),
    paymentReference: z.string().max(200).optional(),
    paymentProofUrl: z.string().optional(),
  })
  .refine(
    (data) => !!data.paymentReference?.trim() || !!data.paymentProofUrl,
    {
      message: "Une référence de paiement ou une capture d'écran est requise",
      path: ['paymentReference'],
    }
  );

export type BookingInput = z.infer<typeof bookingInputSchema>;
export type SelectedProduct = z.infer<typeof selectedProductSchema>;
