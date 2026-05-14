'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import { addMinutes } from 'date-fns';
import SlotPicker, { type AvailableSlot } from '@/components/SlotPicker';
import { PriceConfigurator } from '@/components/booking/PriceConfigurator';
import ProductPicker from '@/components/booking/ProductPicker';
import BookingInfoStep, { type InfoData } from '@/components/booking/BookingInfoStep';
import BookingPaymentForm from '@/components/booking/BookingPaymentForm';
import { parsePriceMatrix, getDurationMinutes } from '@/schemas/priceMatrix';
import type { SelectedOptions } from '@/schemas/priceMatrix';
import type { SelectedProduct } from '@/schemas/booking';

type ServiceData = {
  id: string;
  name: string;
  durationMinutes: number;
  priceCents: number;
};

type Product = {
  id: string;
  name: string;
  description: string | null;
  priceCents: number;
  imageUrl: string | null;
};

type Props = {
  service: ServiceData;
  availableSlots: AvailableSlot[];
  priceMatrixJson: string | null;
  paypalLink: string | null;
  products: Product[];
};

function StepHeader({ n, total, title }: { n: number; total: number; title: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
        {n}
      </span>
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground leading-none mb-0.5">
          Étape {n} / {total}
        </p>
        <h2 className="text-base font-semibold leading-tight">{title}</h2>
      </div>
    </div>
  );
}

export function ReservationFlow({ service, availableSlots, priceMatrixJson, paypalLink, products }: Props) {
  const matrix = parsePriceMatrix(priceMatrixJson);
  const [selectedOptions, setSelectedOptions] = useState<SelectedOptions | null>(null);
  const [priceCents, setPriceCents] = useState<number | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<AvailableSlot | null>(null);
  const [selectedProducts, setSelectedProducts] = useState<SelectedProduct[] | null>(null);
  const [infoData, setInfoData] = useState<InfoData | null>(null);

  const slotStepRef = useRef<HTMLDivElement>(null);
  const productStepRef = useRef<HTMLDivElement>(null);
  const infoStepRef = useRef<HTMLDivElement>(null);
  const paymentStepRef = useRef<HTMLDivElement>(null);

  const hasMatrix = matrix !== null;
  const hasProducts = products.length > 0;
  const optionsReady = !hasMatrix || selectedOptions !== null;

  let stepN = 0;
  const slotStepN = (hasMatrix ? ++stepN : stepN) + 1;
  const productStepN = hasProducts ? slotStepN + 1 : null;
  const infoStepN = (productStepN ?? slotStepN) + 1;
  const paymentStepN = infoStepN + 1;
  const totalSteps = paymentStepN;

  const estimatedDurationMinutes = useMemo(() => {
    if (!matrix || !selectedOptions) return null;
    try { return getDurationMinutes(matrix, selectedOptions) ?? null; } catch { return null; }
  }, [matrix, selectedOptions]);

  const optionsSummary = useMemo(() => {
    if (!matrix || !selectedOptions) return null;
    const { size, length, optionIds, withExtension } = selectedOptions as { size?: string; length?: string; optionIds?: string[]; withExtension?: boolean };
    const optLabels = (optionIds ?? []).map((id) => matrix.options.find((o) => o.id === id)?.label).filter(Boolean);
    const extLabel = withExtension !== undefined ? (withExtension ? 'Avec extension' : 'Sans extension') : null;
    return [extLabel, size, length, ...optLabels].filter(Boolean).join(' · ') || null;
  }, [matrix, selectedOptions]);

  const effectiveDuration = estimatedDurationMinutes ?? service.durationMinutes;
  const effectivePrice = priceCents ?? service.priceCents;
  const bookingEndsAt = selectedSlot
    ? addMinutes(new Date(selectedSlot.startTime), effectiveDuration).toISOString()
    : null;

  // Scroll automatique
  useEffect(() => {
    if (optionsReady && hasMatrix && slotStepRef.current)
      setTimeout(() => slotStepRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [optionsReady]);

  useEffect(() => {
    if (selectedSlot) {
      const ref = hasProducts ? productStepRef : infoStepRef;
      setTimeout(() => ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSlot]);

  useEffect(() => {
    if (selectedProducts !== null && infoStepRef.current)
      setTimeout(() => infoStepRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
  }, [selectedProducts]);

  useEffect(() => {
    if (infoData !== null && paymentStepRef.current)
      setTimeout(() => paymentStepRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
  }, [infoData]);

  const showInfoStep = hasProducts ? selectedProducts !== null : !!selectedSlot;

  return (
    <div className="space-y-10">
      {/* Étape : options */}
      {hasMatrix && (
        <div className="space-y-4">
          <StepHeader n={1} total={totalSteps} title="Vos options" />
          <PriceConfigurator
            matrix={matrix}
            onChange={(opts, price) => {
              setSelectedOptions(opts);
              setPriceCents(price);
              setSelectedSlot(null);
            }}
          />
        </div>
      )}

      {/* Étape : créneau */}
      {optionsReady && (
        <div ref={slotStepRef} className="space-y-4 scroll-mt-6">
          <StepHeader n={slotStepN} total={totalSteps} title="Choisir un créneau" />
          <SlotPicker
            key={JSON.stringify(selectedOptions)}
            availableSlots={availableSlots}
            onSelect={(slot) => {
              setSelectedSlot(slot);
              setSelectedProducts(null);
            }}
            selectedStartTime={selectedSlot?.startTime}
          />
        </div>
      )}

      {/* Étape : produits */}
      {hasProducts && selectedSlot && (
        <div ref={productStepRef} className="space-y-4 scroll-mt-6">
          <StepHeader n={productStepN!} total={totalSteps} title="Produits cosmétiques" />
          <div className="rounded-xl border bg-card p-6">
            <ProductPicker products={products} onNext={(p) => setSelectedProducts(p)} />
          </div>
        </div>
      )}

      {/* Étape : vos informations */}
      {selectedSlot && bookingEndsAt && showInfoStep && (
        <div ref={infoStepRef} className="space-y-4 scroll-mt-6">
          <StepHeader n={infoStepN} total={totalSteps} title="Vos informations" />
          <BookingInfoStep
            onComplete={(data) => {
              setInfoData(data);
            }}
          />
        </div>
      )}

      {/* Étape : paiement */}
      {selectedSlot && bookingEndsAt && infoData && (
        <div ref={paymentStepRef} className="space-y-4 scroll-mt-6">
          <StepHeader n={paymentStepN} total={totalSteps} title="Paiement" />
          <BookingPaymentForm
              service={{
                id: service.id,
                name: service.name,
                durationMinutes: service.durationMinutes,
                estimatedDurationMinutes,
                priceCentsAtBooking: effectivePrice,
                optionsSummary,
              }}
              slot={{
                windowId: selectedSlot.windowId,
                bookingStartsAt: selectedSlot.startTime,
                bookingEndsAt,
              }}
              infoData={infoData}
              selectedOptionsJson={selectedOptions ? JSON.stringify(selectedOptions) : null}
              selectedProducts={selectedProducts ?? []}
              availableProducts={products}
              paypalLink={paypalLink}
            />
        </div>
      )}
    </div>
  );
}
