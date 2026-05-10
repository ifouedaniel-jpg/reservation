import { z } from 'zod';

export const priceOptionSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  priceCents: z.number().int().nonnegative(),
});

export const gridMatrixSchema = z.object({
  type: z.literal('grid'),
  sizes: z.array(z.string().min(1)).min(1),
  lengths: z.array(z.string().min(1)).min(1),
  prices: z.record(z.string(), z.record(z.string(), z.number().int().nonnegative())),
  durations: z.record(z.string(), z.record(z.string(), z.number().int().nonnegative())).optional(),
  options: z.array(priceOptionSchema).default([]),
  notes: z.string().optional(),
});

export const priceMatrixSchema = gridMatrixSchema;

export type PriceMatrix = z.infer<typeof priceMatrixSchema>;
export type GridMatrix = PriceMatrix;
export type PriceOption = z.infer<typeof priceOptionSchema>;

export const selectedOptionsSchema = z.object({
  type: z.literal('grid'),
  size: z.string().min(1),
  length: z.string().min(1),
  optionIds: z.array(z.string()).default([]),
});

export type SelectedOptions = z.infer<typeof selectedOptionsSchema>;

export function parsePriceMatrix(json: string | null | undefined): PriceMatrix | null {
  if (!json) return null;
  try {
    return priceMatrixSchema.parse(JSON.parse(json));
  } catch {
    return null;
  }
}

export function getMinPriceCents(matrix: PriceMatrix): number {
  const all = Object.values(matrix.prices).flatMap((row) => Object.values(row));
  return all.length > 0 ? Math.min(...all) : 0;
}

export function calculatePrice(matrix: PriceMatrix, opts: SelectedOptions): number {
  const base = matrix.prices[opts.length]?.[opts.size];
  if (base === undefined) throw new Error(`Combinaison invalide : ${opts.length} / ${opts.size}`);
  const extras = (opts.optionIds ?? []).reduce((sum, id) => {
    const opt = matrix.options.find((o) => o.id === id);
    return sum + (opt?.priceCents ?? 0);
  }, 0);
  return base + extras;
}

export function getDurationMinutes(matrix: PriceMatrix, opts: SelectedOptions): number | null {
  if (!matrix.durations) return null;
  const d = matrix.durations[opts.length]?.[opts.size];
  return d !== undefined ? d : null;
}
