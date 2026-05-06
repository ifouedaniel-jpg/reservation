import { z } from 'zod';

export const PREFERRED_CHANNELS = ['WHATSAPP', 'INSTAGRAM', 'SMS', 'EMAIL'] as const;
export type PreferredChannel = (typeof PREFERRED_CHANNELS)[number];

export const bookingInputSchema = z
  .object({
    firstName: z.string().min(1, 'Prénom requis'),
    lastName: z.string().min(1, 'Nom requis'),
    phone: z.string().regex(/^\+\d{10,15}$/, 'Numéro invalide (ex : +33612345678)'),
    instagram: z.string().optional(),
    email: z.string().email('Email invalide').optional().or(z.literal('')),
    preferredChannel: z.enum(PREFERRED_CHANNELS, {
      error: 'Canal de contact requis',
    }),
    notes: z.string().max(500, '500 caractères maximum').optional(),
    gdprConsent: z.literal(true, {
      error: 'Vous devez accepter pour continuer',
    }),
    serviceId: z.string().min(1),
    timeSlotId: z.string().min(1),
  })
  .superRefine((data, ctx) => {
    if (data.preferredChannel === 'EMAIL' && !data.email) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Email requis pour ce canal de contact',
        path: ['email'],
      });
    }
  });

export type BookingInput = z.infer<typeof bookingInputSchema>;
