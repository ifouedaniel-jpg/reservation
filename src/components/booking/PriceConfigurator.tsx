'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import type { PriceMatrix, SelectedOptions } from '@/schemas/priceMatrix';
import { calculatePrice, hasExtensionPricing } from '@/schemas/priceMatrix';

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
  const [withExtension, setWithExtension] = useState<boolean | null>(null);

  const showExtensionPicker = hasExtensionPricing(matrix);
  const extensionReady = !showExtensionPicker || withExtension !== null;

  function notify(s: string, l: string, ids: string[], ext: boolean | null) {
    if (!extensionReady && ext === null) return;
    const opts: SelectedOptions = {
      type: 'grid', size: s, length: l, optionIds: ids,
      ...(showExtensionPicker ? { withExtension: ext ?? false } : {}),
    };
    try {
      onChange(opts, calculatePrice(matrix, opts));
    } catch {
      // invalid combination
    }
  }

  function handleSizeSelect(s: string) {
    setSize(s);
    if (length && extensionReady) notify(s, length, optionIds, withExtension);
  }

  function handleLengthSelect(l: string) {
    setLength(l);
    if (size && extensionReady) notify(size, l, optionIds, withExtension);
  }

  function handleExtensionSelect(ext: boolean) {
    setWithExtension(ext);
    if (size && length) notify(size, length, optionIds, ext);
  }

  function toggleOption(id: string) {
    const next = optionIds.includes(id) ? optionIds.filter((x) => x !== id) : [...optionIds, id];
    setOptionIds(next);
    if (size && length && extensionReady) notify(size, length, next, withExtension);
  }

  const currentPrice =
    size && length && extensionReady
      ? (() => {
          try {
            return calculatePrice(matrix, {
              type: 'grid', size, length, optionIds,
              ...(showExtensionPicker ? { withExtension: withExtension ?? false } : {}),
            });
          } catch {
            return null;
          }
        })()
      : null;

  return (
    <div className="space-y-6 rounded-xl border bg-card p-5">
      {/* Extension */}
      {showExtensionPicker && (
        <div className="space-y-3">
          <p className="text-sm font-medium">Extension</p>
          <div className="flex flex-wrap gap-2">
            <Chip
              label="Sans extension"
              selected={withExtension === false}
              onClick={() => handleExtensionSelect(false)}
            />
            <Chip
              label="Avec extension"
              selected={withExtension === true}
              onClick={() => handleExtensionSelect(true)}
            />
          </div>
        </div>
      )}

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
