import { z } from 'zod';

export const serviceInputSchema = z.object({
  name: z.string().min(1, 'Nom requis'),
  description: z.string().min(1, 'Description requise'),
  durationMinutes: z.number().int().positive('Durée invalide'),
  priceCents: z.number().int().positive('Prix invalide'),
  priceWithExtensionCents: z.number().int().positive().nullable().optional(),
  active: z.boolean(),
  sortOrder: z.number().int().min(0, 'Ordre invalide'),
  priceMatrix: z.string().nullable().optional(),
});

export type ServiceInput = z.infer<typeof serviceInputSchema>;
