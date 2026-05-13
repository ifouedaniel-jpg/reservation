"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { formatInTimeZone } from "date-fns-tz";
import { fr } from "date-fns/locale";
import { bookingInputSchema, type BookingInput } from "@/schemas/booking";
import { submitBooking } from "@/server/actions/booking";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const PARIS_TZ = "Europe/Paris";

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
  selectedOptionsJson?: string | null;
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

export default function BookingForm({ service, slot, selectedOptionsJson }: Props) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const startDate = new Date(slot.bookingStartsAt);
  const endDate = new Date(slot.bookingEndsAt);
  const slotDateDisplay = formatInTimeZone(startDate, PARIS_TZ, "EEEE d MMMM yyyy", { locale: fr });
  const slotTimeDisplay = `${formatInTimeZone(startDate, PARIS_TZ, "HH'h'mm")} – ${formatInTimeZone(endDate, PARIS_TZ, "HH'h'mm")}`;

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<BookingInput>({
    resolver: zodResolver(bookingInputSchema),
    defaultValues: {
      serviceId: service.id,
      timeSlotId: slot.windowId,
      bookingStartsAt: slot.bookingStartsAt,
      bookingEndsAt: slot.bookingEndsAt,
      selectedOptionsJson: selectedOptionsJson ?? undefined,
    },
  });

  const onSubmit = async (data: BookingInput) => {
    setIsSubmitting(true);
    try {
      const result = await submitBooking(data);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      if (result.data.paypalLink) {
        window.location.assign(result.data.paypalLink);
      } else {
        router.push(`/ma-reservation/${result.data.publicCode}`);
      }
    } catch {
      toast.error("Une erreur est survenue. Veuillez réessayer.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
      {/* Récap créneau */}
      <div className="rounded-xl border bg-muted/40 p-4 space-y-1 text-sm">
        <p className="font-medium">{service.name}</p>
        {service.optionsSummary && (
          <p className="text-muted-foreground">{service.optionsSummary}</p>
        )}
        <p className="text-muted-foreground capitalize">{slotDateDisplay}</p>
        <p className="text-muted-foreground">{slotTimeDisplay}</p>
        <p className="text-muted-foreground">
          {formatDuration(service.estimatedDurationMinutes ?? service.durationMinutes)} ·{" "}
          <span className="font-medium text-foreground">{formatPrice(service.priceCentsAtBooking)}</span>
        </p>
      </div>

      {/* Champs cachés */}
      <input type="hidden" {...register("serviceId")} />
      <input type="hidden" {...register("timeSlotId")} />
      <input type="hidden" {...register("bookingStartsAt")} />
      <input type="hidden" {...register("bookingEndsAt")} />
      <input type="hidden" {...register("selectedOptionsJson")} />

      {/* Prénom */}
      <div className="space-y-1.5">
        <Label htmlFor="firstName">Prénom</Label>
        <Input
          id="firstName"
          autoComplete="given-name"
          aria-invalid={!!errors.firstName}
          {...register("firstName")}
        />
        {errors.firstName && (
          <p className="text-xs text-destructive">{errors.firstName.message}</p>
        )}
      </div>

      {/* Téléphone */}
      <div className="space-y-1.5">
        <Label htmlFor="phone">Téléphone</Label>
        <div className="flex">
          <span className="inline-flex items-center rounded-l-md border border-r-0 border-input bg-muted px-3 text-sm text-muted-foreground">
            +33
          </span>
          <Input
            id="phone"
            type="tel"
            inputMode="numeric"
            autoComplete="tel-national"
            placeholder="612345678"
            aria-invalid={!!errors.phone}
            className="rounded-l-none"
            onChange={(e) => {
              const digits = e.target.value.replace(/\D/g, "");
              setValue("phone", digits ? `+33${digits}` : "", { shouldValidate: true });
            }}
          />
        </div>
        {errors.phone && (
          <p className="text-xs text-destructive">{errors.phone.message}</p>
        )}
      </div>

      {/* Notes */}
      <div className="space-y-1.5">
        <Label htmlFor="notes">
          Notes{" "}
          <span className="text-muted-foreground font-normal">(optionnel, 500 car. max)</span>
        </Label>
        <textarea
          id="notes"
          rows={3}
          aria-invalid={!!errors.notes}
          {...register("notes")}
          className={cn(
            "flex min-h-[72px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
            "disabled:cursor-not-allowed disabled:opacity-50",
            "resize-none"
          )}
          placeholder="Longueur des cheveux, couleur souhaitée…"
        />
        {errors.notes && (
          <p className="text-xs text-destructive">{errors.notes.message}</p>
        )}
      </div>

      {/* RGPD */}
      <div className="flex items-start gap-3">
        <input
          id="gdprConsent"
          type="checkbox"
          aria-invalid={!!errors.gdprConsent}
          className="mt-0.5 h-4 w-4 rounded border-input accent-primary"
          {...register("gdprConsent")}
        />
        <div className="space-y-1">
          <Label htmlFor="gdprConsent" className="font-normal leading-snug">
            J&apos;accepte que mes données soient conservées 3 ans après mon dernier
            rendez-vous, conformément à notre{' '}
            <a
              href="/confidentialite"
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2"
            >
              politique de confidentialité
            </a>
            . J&apos;ai le droit d&apos;accès et de suppression de mes données.
          </Label>
          {errors.gdprConsent && (
            <p className="text-xs text-destructive">{errors.gdprConsent.message}</p>
          )}
        </div>
      </div>

      <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? "Envoi en cours…" : "Confirmer ma demande"}
      </Button>
    </form>
  );
}
