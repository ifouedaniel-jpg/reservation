import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { formatParis } from "@/lib/time";
import BookingStatusBadge from "@/components/booking/BookingStatusBadge";

type Props = { params: Promise<{ code: string }> };

const CHANNEL_LABELS: Record<string, string> = {
  WHATSAPP: "WhatsApp",
  INSTAGRAM: "Instagram",
  SMS: "SMS",
  EMAIL: "email",
};

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h} h ${m.toString().padStart(2, "0")}` : `${h} h`;
}

function formatPrice(cents: number): string {
  return (cents / 100).toLocaleString("fr-FR", { style: "currency", currency: "EUR" });
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { code } = await params;
  const booking = await prisma.booking.findUnique({ where: { publicCode: code } });
  if (!booking) return {};
  return { title: `Ma réservation — ${booking.customerFirstName}` };
}

export default async function MaReservationPage({ params }: Props) {
  const { code } = await params;

  const booking = await prisma.booking.findUnique({
    where: { publicCode: code },
    include: {
      service: true,
      timeSlot: true,
    },
  });

  if (!booking) notFound();

  const slotDate = formatParis(booking.timeSlot.startsAt, "EEEE d MMMM yyyy");
  const slotTime = formatParis(booking.timeSlot.startsAt, "HH'h'mm");
  const channelLabel = CHANNEL_LABELS[booking.preferredChannel] ?? booking.preferredChannel;
  const businessAddress = process.env.NEXT_PUBLIC_BUSINESS_ADDRESS ?? "notre salon";

  return (
    <div className="mx-auto max-w-xl px-4 py-10">
      <div className="mb-8 space-y-2">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold">Ma réservation</h1>
          <BookingStatusBadge status={booking.status} />
        </div>
        <p className="text-sm text-muted-foreground">
          Réf. <span className="font-mono">{booking.publicCode}</span>
        </p>
      </div>

      {/* Message contextuel selon le statut */}
      <StatusMessage
        status={booking.status}
        channel={channelLabel}
        address={businessAddress}
        serviceSlug={booking.service.slug}
      />

      {/* Détail de la prestation */}
      <div className="mt-8 rounded-xl border divide-y">
        <Row label="Prestation" value={booking.service.name} />
        <Row
          label="Date"
          value={<span className="capitalize">{slotDate}</span>}
        />
        <Row label="Heure" value={slotTime} />
        <Row label="Durée" value={formatDuration(booking.service.durationMinutes)} />
        <Row label="Tarif" value={formatPrice(booking.priceCentsAtBooking)} />
        <Row label="Contact via" value={channelLabel} />
        <Row
          label="Nom"
          value={`${booking.customerFirstName} ${booking.customerLastName}`}
        />
        {booking.notes && <Row label="Notes" value={booking.notes} />}
      </div>

      <p className="mt-8 text-center text-xs text-muted-foreground">
        Conservez ce lien pour suivre votre réservation.
      </p>
    </div>
  );
}

// ── Sous-composants ────────────────────────────────────────────────────────────

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 px-4 py-3 text-sm">
      <span className="text-muted-foreground shrink-0">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}

function StatusMessage({
  status,
  channel,
  address,
  serviceSlug,
}: {
  status: string;
  channel: string;
  address: string;
  serviceSlug: string;
}) {
  if (status === "PENDING") {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        <p className="font-medium">Demande en attente de validation</p>
        <p className="mt-1 text-amber-800">
          Vous recevrez une réponse via {channel} bientôt.
        </p>
      </div>
    );
  }

  if (status === "CONFIRMED") {
    return (
      <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-900">
        <p className="font-medium">Rendez-vous confirmé ✓</p>
        <p className="mt-1 text-green-800">
          Rendez-vous à <strong>{address}</strong>. Le paiement s&apos;effectue sur place.
        </p>
      </div>
    );
  }

  if (status === "REJECTED") {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-900">
        <p className="font-medium">Demande non confirmée</p>
        <p className="mt-1 text-red-800">
          Nous n&apos;avons pas pu confirmer votre demande. N&apos;hésitez pas à choisir
          un autre créneau.
        </p>
        <Link
          href={`/reserver/${serviceSlug}`}
          className="mt-3 inline-block font-medium underline underline-offset-2"
        >
          Choisir un autre créneau →
        </Link>
      </div>
    );
  }

  if (status === "CANCELLED") {
    return (
      <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700">
        <p className="font-medium">Rendez-vous annulé</p>
        <p className="mt-1">Ce rendez-vous a été annulé.</p>
      </div>
    );
  }

  return null;
}
