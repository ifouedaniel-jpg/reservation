'use client';

import { useState } from 'react';
import SlotPicker from '@/components/SlotPicker';
import { PriceConfigurator } from '@/components/booking/PriceConfigurator';
import { parsePriceMatrix } from '@/schemas/priceMatrix';
import type { SelectedOptions } from '@/schemas/priceMatrix';

type Slot = { id: string; startsAt: string; endsAt: string };

type Props = {
  serviceSlug: string;
  slots: Slot[];
  priceMatrixJson: string | null;
};

export function ReservationFlow({ serviceSlug, slots, priceMatrixJson }: Props) {
  const matrix = parsePriceMatrix(priceMatrixJson);
  const [selectedOptions, setSelectedOptions] = useState<SelectedOptions | null>(null);
  const [priceCents, setPriceCents] = useState<number | null>(null);

  const hasMatrix = matrix !== null;
  const optionsReady = !hasMatrix || selectedOptions !== null;

  const extraParams: Record<string, string> = {};
  if (selectedOptions) {
    extraParams.selectedOptions = JSON.stringify(selectedOptions);
  }
  if (priceCents !== null) {
    extraParams.priceCents = String(priceCents);
  }

  return (
    <div className="space-y-8">
      {matrix && (
        <div className="space-y-3">
          <h2 className="text-base font-semibold">Vos options</h2>
          <PriceConfigurator
            matrix={matrix}
            onChange={(opts, price) => {
              setSelectedOptions(opts);
              setPriceCents(price);
            }}
          />
        </div>
      )}

      <div className="space-y-3">
        <h2 className="text-base font-semibold">Choisir un créneau</h2>
        <SlotPicker
          serviceSlug={serviceSlug}
          slots={slots}
          extraParams={optionsReady ? extraParams : undefined}
          disabled={!optionsReady}
        />
      </div>
    </div>
  );
}
