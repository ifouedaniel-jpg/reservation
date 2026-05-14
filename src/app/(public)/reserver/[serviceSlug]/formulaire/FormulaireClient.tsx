"use client";

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
  return (
    <BookingPaymentForm
      service={service}
      slot={slot}
      selectedOptionsJson={selectedOptionsJson}
      paypalLink={paypalLink}
    />
  );
}
