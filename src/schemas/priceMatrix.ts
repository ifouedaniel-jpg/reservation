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
  extensionPrices: z.record(z.string(), z.record(z.string(), z.number().int().nonnegative())).optional(),
  durations: z.record(z.string(), z.record(z.string(), z.number().int().nonnegative())).optional(),
  extensionDurations: z.record(z.string(), z.record(z.string(), z.number().int().nonnegative())).optional(),
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
  withExtension: z.boolean().optional(),
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

export function hasExtensionPricing(matrix: PriceMatrix): boolean {
  return !!matrix.extensionPrices && Object.keys(matrix.extensionPrices).length > 0;
}

export function getMinPriceCents(matrix: PriceMatrix): number {
  const all = Object.values(matrix.prices).flatMap((row) => Object.values(row));
  return all.length > 0 ? Math.min(...all) : 0;
}

export function getMinExtensionPriceCents(matrix: PriceMatrix): number | null {
  if (!matrix.extensionPrices) return null;
  const all = Object.values(matrix.extensionPrices).flatMap((row) => Object.values(row));
  return all.length > 0 ? Math.min(...all) : null;
}

export function calculatePrice(matrix: PriceMatrix, opts: SelectedOptions): number {
  const grid = opts.withExtension && matrix.extensionPrices ? matrix.extensionPrices : matrix.prices;
  const base = grid[opts.length]?.[opts.size];
  if (base === undefined) throw new Error(`Combinaison invalide : ${opts.length} / ${opts.size}`);
  const extras = (opts.optionIds ?? []).reduce((sum, id) => {
    const opt = matrix.options.find((o) => o.id === id);
    return sum + (opt?.priceCents ?? 0);
  }, 0);
  return base + extras;
}

export function getDurationMinutes(matrix: PriceMatrix, opts: SelectedOptions): number | null {
  const durations = opts.withExtension && matrix.extensionDurations ? matrix.extensionDurations : matrix.durations;
  if (!durations) return null;
  const d = durations[opts.length]?.[opts.size];
  return d !== undefined ? d : null;
}
