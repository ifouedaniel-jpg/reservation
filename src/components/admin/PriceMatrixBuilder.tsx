'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { parsePriceMatrix } from '@/schemas/priceMatrix';

// ── Types ──────────────────────────────────────────────────────────────────────

type MatrixType = 'fixed' | 'grid';

type GridAddon = { id: string; label: string; price: string };

type GridState = {
  sizes: string[];
  lengths: string[];
  prices: Record<string, Record<string, string>>;
  durations: Record<string, Record<string, string>>;
  hasExtension: boolean;
  extensionPrices: Record<string, Record<string, string>>;
  extensionDurations: Record<string, Record<string, string>>;
  addons: GridAddon[];
  notes: string;
};

// ── Helpers ────────────────────────────────────────────────────────────────────

function uid() {
  return Math.random().toString(36).slice(2, 9);
}

function centsToEuros(cents: number): string {
  return (cents / 100).toFixed(2);
}

function eurosToCents(euros: string): number {
  return Math.round(parseFloat(euros) * 100) || 0;
}

function emptyGrid(sizes: string[], lengths: string[]): Record<string, Record<string, string>> {
  const g: Record<string, Record<string, string>> = {};
  for (const l of lengths) { g[l] = {}; for (const s of sizes) g[l][s] = ''; }
  return g;
}

function serializeToJson(type: MatrixType, grid: GridState): string {
  if (type === 'fixed') {
    const options = grid.addons
      .filter((a) => a.label.trim())
      .map((a) => ({ id: a.id, label: a.label.trim(), priceCents: eurosToCents(a.price) }));
    if (options.length === 0 && !grid.notes.trim()) return '';
    return JSON.stringify({
      type: 'fixed',
      options,
      ...(grid.notes.trim() ? { notes: grid.notes.trim() } : {}),
    });
  }
  if (!grid.sizes.length || !grid.lengths.length) return '';

  const prices: Record<string, Record<string, number>> = {};
  for (const l of grid.lengths) {
    prices[l] = {};
    for (const s of grid.sizes) prices[l][s] = eurosToCents(grid.prices[l]?.[s] ?? '');
  }

  const hasDurations = grid.lengths.some((l) => grid.sizes.some((s) => grid.durations[l]?.[s]));
  const durations: Record<string, Record<string, number>> = {};
  if (hasDurations) {
    for (const l of grid.lengths) {
      durations[l] = {};
      for (const s of grid.sizes) durations[l][s] = parseInt(grid.durations[l]?.[s] ?? '0') || 0;
    }
  }

  let extensionPrices: Record<string, Record<string, number>> | undefined;
  let extensionDurations: Record<string, Record<string, number>> | undefined;

  if (grid.hasExtension) {
    extensionPrices = {};
    for (const l of grid.lengths) {
      extensionPrices[l] = {};
      for (const s of grid.sizes) extensionPrices[l][s] = eurosToCents(grid.extensionPrices[l]?.[s] ?? '');
    }

    const hasExtDurations = grid.lengths.some((l) => grid.sizes.some((s) => grid.extensionDurations[l]?.[s]));
    if (hasExtDurations) {
      extensionDurations = {};
      for (const l of grid.lengths) {
        extensionDurations[l] = {};
        for (const s of grid.sizes) extensionDurations[l][s] = parseInt(grid.extensionDurations[l]?.[s] ?? '0') || 0;
      }
    }
  }

  return JSON.stringify({
    type: 'grid',
    sizes: grid.sizes,
    lengths: grid.lengths,
    prices,
    ...(extensionPrices ? { extensionPrices } : {}),
    ...(hasDurations ? { durations } : {}),
    ...(extensionDurations ? { extensionDurations } : {}),
    options: grid.addons
      .filter((a) => a.label.trim())
      .map((a) => ({ id: a.id, label: a.label.trim(), priceCents: eurosToCents(a.price) })),
    ...(grid.notes.trim() ? { notes: grid.notes.trim() } : {}),
  });
}

function initFromJson(json: string | null): { type: MatrixType; grid: GridState } {
  const defaultGrid: GridState = {
    sizes: [], lengths: [], prices: {}, durations: {},
    hasExtension: false, extensionPrices: {}, extensionDurations: {},
    addons: [], notes: '',
  };

  if (!json) return { type: 'fixed', grid: defaultGrid };

  const matrix = parsePriceMatrix(json);
  if (!matrix) return { type: 'fixed', grid: defaultGrid };

  if (matrix.type === 'fixed') {
    return {
      type: 'fixed',
      grid: {
        ...defaultGrid,
        addons: matrix.options.map((o) => ({ id: o.id, label: o.label, price: centsToEuros(o.priceCents) })),
        notes: matrix.notes ?? '',
      },
    };
  }

  const prices: Record<string, Record<string, string>> = {};
  const durations: Record<string, Record<string, string>> = {};
  const extensionPrices: Record<string, Record<string, string>> = {};
  const extensionDurations: Record<string, Record<string, string>> = {};

  for (const l of matrix.lengths) {
    prices[l] = {};
    durations[l] = {};
    extensionPrices[l] = {};
    extensionDurations[l] = {};
    for (const s of matrix.sizes) {
      prices[l][s] = centsToEuros(matrix.prices[l]?.[s] ?? 0);
      const d = matrix.durations?.[l]?.[s];
      durations[l][s] = d ? String(d) : '';
      const ep = matrix.extensionPrices?.[l]?.[s];
      extensionPrices[l][s] = ep !== undefined ? centsToEuros(ep) : '';
      const ed = matrix.extensionDurations?.[l]?.[s];
      extensionDurations[l][s] = ed !== undefined ? String(ed) : '';
    }
  }

  return {
    type: 'grid',
    grid: {
      sizes: matrix.sizes,
      lengths: matrix.lengths,
      prices,
      durations,
      hasExtension: !!matrix.extensionPrices,
      extensionPrices,
      extensionDurations,
      addons: matrix.options.map((o) => ({ id: o.id, label: o.label, price: centsToEuros(o.priceCents) })),
      notes: matrix.notes ?? '',
    },
  };
}

// ── Tag input ─────────────────────────────────────────────────────────────────

function TagInput({
  tags, placeholder, onAdd, onRemove,
}: {
  tags: string[];
  placeholder: string;
  onAdd: (v: string) => void;
  onRemove: (v: string) => void;
}) {
  const [value, setValue] = useState('');

  function commit() {
    const v = value.trim();
    if (v && !tags.includes(v)) onAdd(v);
    setValue('');
  }

  return (
    <div className="flex flex-wrap gap-2">
      {tags.map((t) => (
        <span key={t} className="inline-flex items-center gap-1 rounded-full border bg-muted px-3 py-1 text-sm">
          {t}
          <button type="button" onClick={() => onRemove(t)} className="ml-0.5 leading-none text-muted-foreground hover:text-destructive">×</button>
        </span>
      ))}
      <div className="flex gap-1">
        <Input value={value} onChange={(e) => setValue(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); commit(); } }} placeholder={placeholder} className="h-8 w-40 text-sm" />
        <button type="button" onClick={commit} className="rounded-md border px-2.5 text-sm hover:bg-accent">+</button>
      </div>
    </div>
  );
}

// ── Price / Duration cell table ───────────────────────────────────────────────

function GridTable({
  sizes, lengths, values, prefix, placeholder, onChange,
}: {
  sizes: string[];
  lengths: string[];
  values: Record<string, Record<string, string>>;
  prefix: string;
  placeholder: string;
  onChange: (length: string, size: string, value: string) => void;
}) {
  return (
    <div className="overflow-x-auto rounded-md border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/50">
            <th className="px-3 py-2 text-left font-medium text-muted-foreground" />
            {sizes.map((s) => (
              <th key={s} className="px-3 py-2 text-center font-medium">{s}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {lengths.map((l, li) => (
            <tr key={l} className={cn(li !== 0 && 'border-t')}>
              <td className="whitespace-nowrap bg-muted/30 px-3 py-2 font-medium text-muted-foreground">{l}</td>
              {sizes.map((s) => (
                <td key={s} className="border-l px-1 py-1">
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      step={prefix === '€' ? '0.01' : '1'}
                      value={values[l]?.[s] ?? ''}
                      onChange={(e) => onChange(l, s, e.target.value)}
                      className="h-8 w-full rounded-sm bg-transparent px-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                      placeholder={placeholder}
                    />
                  </div>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function PriceMatrixBuilder({
  initialJson,
  onTypeChange,
}: {
  initialJson: string | null;
  onTypeChange?: (type: MatrixType) => void;
}) {
  const initial = initFromJson(initialJson);
  const [type, setType] = useState<MatrixType>(initial.type);
  const [grid, setGrid] = useState<GridState>(initial.grid);

  function handleTypeChange(t: MatrixType) {
    setType(t);
    onTypeChange?.(t);
  }

  const matrixJson = serializeToJson(type, grid);

  function addSize(label: string) {
    setGrid((prev) => {
      const newPrices = { ...prev.prices };
      const newDurations = { ...prev.durations };
      const newExtPrices = { ...prev.extensionPrices };
      const newExtDurations = { ...prev.extensionDurations };
      for (const l of prev.lengths) {
        newPrices[l] = { ...(newPrices[l] ?? {}), [label]: '' };
        newDurations[l] = { ...(newDurations[l] ?? {}), [label]: '' };
        newExtPrices[l] = { ...(newExtPrices[l] ?? {}), [label]: '' };
        newExtDurations[l] = { ...(newExtDurations[l] ?? {}), [label]: '' };
      }
      return { ...prev, sizes: [...prev.sizes, label], prices: newPrices, durations: newDurations, extensionPrices: newExtPrices, extensionDurations: newExtDurations };
    });
  }

  function removeSize(label: string) {
    setGrid((prev) => {
      const newPrices = { ...prev.prices };
      const newDurations = { ...prev.durations };
      const newExtPrices = { ...prev.extensionPrices };
      const newExtDurations = { ...prev.extensionDurations };
      for (const l of prev.lengths) {
        const pr = { ...newPrices[l] }; delete pr[label]; newPrices[l] = pr;
        const du = { ...newDurations[l] }; delete du[label]; newDurations[l] = du;
        const ep = { ...newExtPrices[l] }; delete ep[label]; newExtPrices[l] = ep;
        const ed = { ...newExtDurations[l] }; delete ed[label]; newExtDurations[l] = ed;
      }
      return { ...prev, sizes: prev.sizes.filter((s) => s !== label), prices: newPrices, durations: newDurations, extensionPrices: newExtPrices, extensionDurations: newExtDurations };
    });
  }

  function addLength(label: string) {
    setGrid((prev) => {
      const priceRow: Record<string, string> = {};
      const durRow: Record<string, string> = {};
      const extPriceRow: Record<string, string> = {};
      const extDurRow: Record<string, string> = {};
      for (const s of prev.sizes) { priceRow[s] = ''; durRow[s] = ''; extPriceRow[s] = ''; extDurRow[s] = ''; }
      return {
        ...prev,
        lengths: [...prev.lengths, label],
        prices: { ...prev.prices, [label]: priceRow },
        durations: { ...prev.durations, [label]: durRow },
        extensionPrices: { ...prev.extensionPrices, [label]: extPriceRow },
        extensionDurations: { ...prev.extensionDurations, [label]: extDurRow },
      };
    });
  }

  function removeLength(label: string) {
    setGrid((prev) => {
      const newPrices = { ...prev.prices }; delete newPrices[label];
      const newDurations = { ...prev.durations }; delete newDurations[label];
      const newExtPrices = { ...prev.extensionPrices }; delete newExtPrices[label];
      const newExtDurations = { ...prev.extensionDurations }; delete newExtDurations[label];
      return { ...prev, lengths: prev.lengths.filter((l) => l !== label), prices: newPrices, durations: newDurations, extensionPrices: newExtPrices, extensionDurations: newExtDurations };
    });
  }

  function toggleExtension(enabled: boolean) {
    setGrid((prev) => {
      if (enabled) {
        return { ...prev, hasExtension: true, extensionPrices: emptyGrid(prev.sizes, prev.lengths), extensionDurations: emptyGrid(prev.sizes, prev.lengths) };
      }
      return { ...prev, hasExtension: false, extensionPrices: {}, extensionDurations: {} };
    });
  }

  const typeCards: { value: MatrixType; label: string; desc: string }[] = [
    { value: 'fixed', label: 'Prix fixe', desc: 'Un seul tarif et une durée fixe, définis ci-dessus.' },
    { value: 'grid', label: 'Grille taille × longueur', desc: 'Prix et durée variables selon la taille et la longueur.' },
  ];

  return (
    <div className="space-y-3">
      <input type="hidden" name="priceMatrix" value={matrixJson} />

      <Label>Type de tarification</Label>
      <div className="grid grid-cols-2 gap-2">
        {typeCards.map((card) => (
          <button
            key={card.value}
            type="button"
            onClick={() => handleTypeChange(card.value)}
            className={cn(
              'rounded-lg border p-3 text-left text-sm transition-colors',
              type === card.value ? 'border-primary bg-primary/5 text-primary' : 'border-border hover:bg-accent',
            )}
          >
            <span className="block font-medium">{card.label}</span>
            <span className="mt-0.5 block text-xs text-muted-foreground">{card.desc}</span>
          </button>
        ))}
      </div>

      {type === 'grid' && (
        <div className="space-y-5 rounded-lg border p-4">
          {/* Tailles */}
          <div className="space-y-2">
            <Label>Tailles (ex : Petites, Moyennes, Grandes)</Label>
            <TagInput tags={grid.sizes} placeholder="Nouvelle taille…" onAdd={addSize} onRemove={removeSize} />
          </div>

          {/* Longueurs */}
          <div className="space-y-2">
            <Label>Longueurs (ex : Court, Mi-long, Long)</Label>
            <TagInput tags={grid.lengths} placeholder="Nouvelle longueur…" onAdd={addLength} onRemove={removeLength} />
          </div>

          {grid.sizes.length > 0 && grid.lengths.length > 0 && (
            <>
              {/* Tableau des prix sans extension */}
              <div className="space-y-2">
                <Label>{grid.hasExtension ? 'Tarifs sans extension (€)' : 'Tarifs (€)'}</Label>
                <GridTable
                  sizes={grid.sizes}
                  lengths={grid.lengths}
                  values={grid.prices}
                  prefix="€"
                  placeholder="0"
                  onChange={(l, s, v) =>
                    setGrid((prev) => ({ ...prev, prices: { ...prev.prices, [l]: { ...(prev.prices[l] ?? {}), [s]: v } } }))
                  }
                />
              </div>

              {/* Tableau des durées sans extension */}
              <div className="space-y-2">
                <Label>
                  {grid.hasExtension ? 'Durées sans extension (min)' : 'Durées (minutes)'}
                  {' '}
                  <span className="text-xs font-normal text-muted-foreground">(ex : 120 = 2 h)</span>
                </Label>
                <GridTable
                  sizes={grid.sizes}
                  lengths={grid.lengths}
                  values={grid.durations}
                  prefix="'"
                  placeholder="0"
                  onChange={(l, s, v) =>
                    setGrid((prev) => ({ ...prev, durations: { ...prev.durations, [l]: { ...(prev.durations[l] ?? {}), [s]: v } } }))
                  }
                />
              </div>

              {/* Toggle extension */}
              <div className="rounded-lg border border-dashed p-3">
                <label className="flex cursor-pointer items-center gap-3">
                  <input
                    type="checkbox"
                    checked={grid.hasExtension}
                    onChange={(e) => toggleExtension(e.target.checked)}
                    className="h-4 w-4 rounded"
                  />
                  <span className="text-sm font-medium">Activer les tarifs avec extension</span>
                </label>
                {grid.hasExtension && (
                  <p className="mt-1 text-xs text-muted-foreground pl-7">
                    La cliente pourra choisir &laquo; avec ou sans extension &raquo; lors de la réservation.
                  </p>
                )}
              </div>

              {/* Grilles extension */}
              {grid.hasExtension && (
                <>
                  <div className="space-y-2">
                    <Label>Tarifs avec extension (€)</Label>
                    <GridTable
                      sizes={grid.sizes}
                      lengths={grid.lengths}
                      values={grid.extensionPrices}
                      prefix="€"
                      placeholder="0"
                      onChange={(l, s, v) =>
                        setGrid((prev) => ({ ...prev, extensionPrices: { ...prev.extensionPrices, [l]: { ...(prev.extensionPrices[l] ?? {}), [s]: v } } }))
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>
                      Durées avec extension (min){' '}
                      <span className="text-xs font-normal text-muted-foreground">(optionnel)</span>
                    </Label>
                    <GridTable
                      sizes={grid.sizes}
                      lengths={grid.lengths}
                      values={grid.extensionDurations}
                      prefix="'"
                      placeholder="0"
                      onChange={(l, s, v) =>
                        setGrid((prev) => ({ ...prev, extensionDurations: { ...prev.extensionDurations, [l]: { ...(prev.extensionDurations[l] ?? {}), [s]: v } } }))
                      }
                    />
                  </div>
                </>
              )}
            </>
          )}

        </div>
      )}

      {/* Suppléments — affichés pour prix fixe et grille */}
      <div className="space-y-2 rounded-lg border p-4">
        <Label>
          Suppléments optionnels{' '}
          <span className="text-xs font-normal text-muted-foreground">(facultatif)</span>
        </Label>
        {grid.addons.map((addon) => (
          <div key={addon.id} className="flex items-center gap-2">
            <Input
              value={addon.label}
              onChange={(e) => setGrid((prev) => ({ ...prev, addons: prev.addons.map((a) => a.id === addon.id ? { ...a, label: e.target.value } : a) }))}
              placeholder="Ex : Pose de perles"
              className="h-8 flex-1 text-sm"
            />
            <div className="relative w-28">
              <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">+€</span>
              <Input
                type="number" min="0" step="0.01"
                value={addon.price}
                onChange={(e) => setGrid((prev) => ({ ...prev, addons: prev.addons.map((a) => a.id === addon.id ? { ...a, price: e.target.value } : a) }))}
                placeholder="0"
                className="h-8 pl-8 text-sm"
              />
            </div>
            <button type="button" onClick={() => setGrid((prev) => ({ ...prev, addons: prev.addons.filter((a) => a.id !== addon.id) }))} className="text-lg leading-none text-muted-foreground hover:text-destructive">×</button>
          </div>
        ))}
        <button type="button" onClick={() => setGrid((prev) => ({ ...prev, addons: [...prev.addons, { id: uid(), label: '', price: '' }] }))} className="text-sm text-primary hover:underline">
          + Ajouter un supplément
        </button>
        <div className="pt-2 space-y-1">
          <Label className="text-xs font-normal text-muted-foreground">Note informative (facultatif)</Label>
          <Input value={grid.notes} onChange={(e) => setGrid((prev) => ({ ...prev, notes: e.target.value }))} placeholder="Ex : Tarifs indicatifs, devis possible selon épaisseur" className="text-sm" />
        </div>
      </div>
    </div>
  );
}
