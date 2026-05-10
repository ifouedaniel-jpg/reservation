'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import type { PriceMatrix, SelectedOptions } from '@/schemas/priceMatrix';
import { calculatePrice } from '@/schemas/priceMatrix';

type Props = {
  matrix: PriceMatrix;
  onChange: (opts: SelectedOptions, priceCents: number) => void;
};

function formatPrice(cents: number) {
  return (cents / 100).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' });
}

function Chip({ label, selected, onClick }: { label: string; selected: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-lg border px-4 py-2 text-sm font-medium transition-colors',
        selected
          ? 'border-primary bg-primary text-primary-foreground'
          : 'border-border bg-background hover:bg-accent hover:text-accent-foreground',
      )}
    >
      {label}
    </button>
  );
}

export function PriceConfigurator({ matrix, onChange }: Props) {
  const [size, setSize] = useState<string | null>(null);
  const [length, setLength] = useState<string | null>(null);
  const [optionIds, setOptionIds] = useState<string[]>([]);

  function notify(s: string, l: string, ids: string[]) {
    const opts: SelectedOptions = { type: 'grid', size: s, length: l, optionIds: ids };
    try {
      onChange(opts, calculatePrice(matrix, opts));
    } catch {
      // invalid combination, don't call onChange
    }
  }

  function handleSizeSelect(s: string) {
    setSize(s);
    if (length) notify(s, length, optionIds);
  }

  function handleLengthSelect(l: string) {
    setLength(l);
    if (size) notify(size, l, optionIds);
  }

  function toggleOption(id: string) {
    const next = optionIds.includes(id) ? optionIds.filter((x) => x !== id) : [...optionIds, id];
    setOptionIds(next);
    if (size && length) notify(size, length, next);
  }

  const currentPrice =
    size && length
      ? (() => {
          try {
            return calculatePrice(matrix, { type: 'grid', size, length, optionIds });
          } catch {
            return null;
          }
        })()
      : null;

  return (
    <div className="space-y-6 rounded-xl border bg-card p-5">
      {/* Taille */}
      <div className="space-y-3">
        <p className="text-sm font-medium">Taille des tresses</p>
        <div className="flex flex-wrap gap-2">
          {matrix.sizes.map((s) => (
            <Chip key={s} label={s} selected={size === s} onClick={() => handleSizeSelect(s)} />
          ))}
        </div>
      </div>

      {/* Longueur */}
      <div className="space-y-3">
        <p className="text-sm font-medium">Longueur souhaitée</p>
        <div className="flex flex-wrap gap-2">
          {matrix.lengths.map((l) => (
            <Chip key={l} label={l} selected={length === l} onClick={() => handleLengthSelect(l)} />
          ))}
        </div>
      </div>

      {/* Options */}
      {matrix.options.length > 0 && (
        <div className="space-y-3">
          <p className="text-sm font-medium">Options</p>
          <div className="flex flex-wrap gap-2">
            {matrix.options.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => toggleOption(opt.id)}
                className={cn(
                  'rounded-lg border px-4 py-2 text-sm transition-colors',
                  optionIds.includes(opt.id)
                    ? 'border-primary bg-primary/10 font-medium text-primary'
                    : 'border-border bg-background hover:bg-accent',
                )}
              >
                {opt.label}{' '}
                <span className="text-xs opacity-70">+{formatPrice(opt.priceCents)}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Notes */}
      {matrix.notes && (
        <p className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">
          ℹ️ {matrix.notes}
        </p>
      )}

      {/* Prix calculé */}
      {currentPrice !== null && (
        <div className="flex items-center justify-between border-t pt-4">
          <span className="text-sm text-muted-foreground">Prix estimé</span>
          <span className="text-xl font-bold text-primary">{formatPrice(currentPrice)}</span>
        </div>
      )}
    </div>
  );
}
