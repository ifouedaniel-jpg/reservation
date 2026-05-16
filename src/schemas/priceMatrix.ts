import { z } from 'zod';

export const priceOptionSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  priceCents: z.number().int().nonnegative(),
});

export const fixedWithOptionsSchema = z.object({
  type: z.literal('fixed'),
  options: z.array(priceOptionSchema).default([]),
  notes: z.string().optional(),
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

export const priceMatrixSchema = z.union([fixedWithOptionsSchema, gridMatrixSchema]);

export type PriceMatrix = z.infer<typeof priceMatrixSchema>;
export type GridMatrix = z.infer<typeof gridMatrixSchema>;
export type FixedMatrix = z.infer<typeof fixedWithOptionsSchema>;
export type PriceOption = z.infer<typeof priceOptionSchema>;

const selectedGridOptionsSchema = z.object({
  type: z.literal('grid'),
  size: z.string().min(1),
  length: z.string().min(1),
  optionIds: z.array(z.string()).default([]),
  withExtension: z.boolean().optional(),
});

const selectedFixedOptionsSchema = z.object({
  type: z.literal('fixed'),
  optionIds: z.array(z.string()).default([]),
});

export const selectedOptionsSchema = z.union([selectedGridOptionsSchema, selectedFixedOptionsSchema]);

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
  if (matrix.type === 'fixed') return false;
  return !!matrix.extensionPrices && Object.keys(matrix.extensionPrices).length > 0;
}

export function getMinPriceCents(matrix: PriceMatrix): number {
  if (matrix.type === 'fixed') return 0;
  const all = Object.values(matrix.prices).flatMap((row) => Object.values(row));
  return all.length > 0 ? Math.min(...all) : 0;
}

export function getMinExtensionPriceCents(matrix: PriceMatrix): number | null {
  if (matrix.type === 'fixed') return null;
  if (!matrix.extensionPrices) return null;
  const all = Object.values(matrix.extensionPrices).flatMap((row) => Object.values(row));
  return all.length > 0 ? Math.min(...all) : null;
}

export function calculatePrice(matrix: PriceMatrix, opts: SelectedOptions, basePriceCents = 0): number {
  if (opts.type === 'fixed') {
    const extras = opts.optionIds.reduce((sum, id) => {
      const opt = matrix.options.find((o) => o.id === id);
      return sum + (opt?.priceCents ?? 0);
    }, 0);
    return basePriceCents + extras;
  }
  if (matrix.type !== 'grid') throw new Error('Matrix type mismatch');
  const grid = opts.withExtension && matrix.extensionPrices ? matrix.extensionPrices : matrix.prices;
  const base = grid[opts.length]?.[opts.size];
  if (base === undefined) throw new Error(`Combinaison invalide : ${opts.length} / ${opts.size}`);
  const extras = opts.optionIds.reduce((sum, id) => {
    const opt = matrix.options.find((o) => o.id === id);
    return sum + (opt?.priceCents ?? 0);
  }, 0);
  return base + extras;
}

export function getDurationMinutes(matrix: PriceMatrix, opts: SelectedOptions): number | null {
  if (opts.type === 'fixed' || matrix.type !== 'grid') return null;
  const durations = opts.withExtension && matrix.extensionDurations ? matrix.extensionDurations : matrix.durations;
  if (!durations) return null;
  const d = durations[opts.length]?.[opts.size];
  return d !== undefined ? d : null;
}
