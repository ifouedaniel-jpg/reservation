"use client";

import { useState } from "react";
import BookingInfoStep, { type InfoData } from "@/components/booking/BookingInfoStep";
import BookingPaymentForm from "@/components/booking/BookingPaymentForm";

type ServiceSummary = {
  id: string;
  name: string;
  durationMinutes: number;
  estimatedDurationMinutes: number | null;
  priceCentsAtBooking: number;
  optionsSummary: string | null;
};

type SlotSummary = {
  windowId: string;
  bookingStartsAt: string;
  bookingEndsAt: string;
};

type Props = {
  service: ServiceSummary;
  slot: SlotSummary;
  selectedOptionsJson: string | null;
  paypalLink: string | null;
};

export default function FormulaireClient({ service, slot, selectedOptionsJson, paypalLink }: Props) {
  const [infoData, setInfoData] = useState<InfoData | null>(null);

  return (
    <div className="space-y-10">
      <BookingInfoStep onComplete={setInfoData} />
      {infoData && (
        <BookingPaymentForm
          service={service}
          slot={slot}
          infoData={infoData}
          selectedOptionsJson={selectedOptionsJson}
          paypalLink={paypalLink}
        />
      )}
    </div>
  );
}
