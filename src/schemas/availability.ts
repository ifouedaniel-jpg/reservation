import { z } from 'zod';

export const recurringAvailabilitySchema = z
  .object({
    dayOfWeek: z.coerce.number().int().min(0).max(6),
    startTime: z.string().regex(/^\d{2}:\d{2}$/, 'Format HH:MM requis'),
    endTime: z.string().regex(/^\d{2}:\d{2}$/, 'Format HH:MM requis'),
    slotMinutes: z.coerce
      .number()
      .int()
      .refine((v) => [15, 30, 60].includes(v), 'Valeur invalide (15, 30 ou 60)'),
  })
  .refine((d) => d.startTime < d.endTime, {
    message: "L'heure de fin doit être après l'heure de début",
    path: ['endTime'],
  });

export const blockedDateSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date invalide (YYYY-MM-DD)'),
  reason: z.string().optional(),
});

export type RecurringAvailabilityInput = z.infer<typeof recurringAvailabilitySchema>;
export type BlockedDateInput = z.infer<typeof blockedDateSchema>;
