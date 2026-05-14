"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { formatInTimeZone } from "date-fns-tz";
import { fr } from "date-fns/locale";
import { toast } from "sonner";
import { submitBooking, uploadPaymentProof } from "@/server/actions/booking";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { SelectedProduct } from "@/schemas/booking";

const PARIS_TZ = "Europe/Paris";

const formSchema = z.object({
  firstName: z.string().min(1, "Prénom requis"),
  phone: z.string().regex(/^\+\d{10,15}$/, "Numéro invalide (ex : +33612345678)"),
  notes: z.string().max(500, "500 caractères maximum").optional(),
});

type FormData = z.infer<typeof formSchema>;

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

type ProductSummary = {
  id: string;
  name: string;
  priceCents: number;
};

type Props = {
  service: ServiceSummary;
  slot: SlotSummary;
  selectedOptionsJson?: string | null;
  selectedProducts?: SelectedProduct[];
  availableProducts?: ProductSummary[];
  paypalLink: string | null;
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

export default function BookingPaymentForm({ service, slot, selectedOptionsJson, selectedProducts = [], availableProducts = [], paypalLink }: Props) {
  const router = useRouter();
  const [reference, setReference] = useState("");
  const [proofUrl, setProofUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [slotError, setSlotError] = useState<string | null>(null);
  const [successCode, setSuccessCode] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(5);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const redirectTo = successCode ? `/ma-reservation/${successCode}` : null;

  useEffect(() => {
    if (!redirectTo) return;
    const interval = setInterval(() => {
      setCountdown((n) => (n <= 1 ? 0 : n - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [redirectTo]);

  useEffect(() => {
    if (countdown === 0 && redirectTo) {
      router.push(redirectTo);
    }
  }, [countdown, redirectTo, router]);

  const startDate = new Date(slot.bookingStartsAt);
  const endDate = new Date(slot.bookingEndsAt);
  const slotDateDisplay = formatInTimeZone(startDate, PARIS_TZ, "EEEE d MMMM yyyy", { locale: fr });
  const slotTimeDisplay = `${formatInTimeZone(startDate, PARIS_TZ, "HH'h'mm")} – ${formatInTimeZone(endDate, PARIS_TZ, "HH'h'mm")}`;

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isValid: infoValid },
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    mode: "onChange",
  });

  const productTotal = selectedProducts.reduce((sum, sp) => {
    const p = availableProducts.find((pr) => pr.id === sp.productId);
    return sum + (p?.priceCents ?? 0) * sp.quantity;
  }, 0);
  const grandTotal = service.priceCentsAtBooking + productTotal;

  const paymentValid = reference.trim().length > 0 || proofUrl !== null;
  const canSubmit = infoValid && paymentValid && !isUploading;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setFileName(file.name);
    setProofUrl(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const result = await uploadPaymentProof(formData);
      if (!result.ok) {
        toast.error(result.error);
        setFileName(null);
      } else {
        setProofUrl(result.url);
      }
    } catch {
      toast.error("Erreur lors de l'upload. Veuillez réessayer.");
      setFileName(null);
    } finally {
      setIsUploading(false);
    }
  };

  const onSubmit = async (data: FormData) => {
    if (!paymentValid) return;
    setIsSubmitting(true);
    setSlotError(null);

    try {
      const result = await submitBooking({
        firstName: data.firstName,
        phone: data.phone,
        notes: data.notes,
        serviceId: service.id,
        timeSlotId: slot.windowId,
        bookingStartsAt: slot.bookingStartsAt,
        bookingEndsAt: slot.bookingEndsAt,
        selectedOptionsJson: selectedOptionsJson ?? undefined,
        selectedProducts: selectedProducts.length > 0 ? selectedProducts : undefined,
        paymentReference: reference.trim() || undefined,
        paymentProofUrl: proofUrl ?? undefined,
      });

      if (!result.ok) {
        if (result.error.includes("créneau")) {
          setSlotError(result.error);
        } else {
          toast.error(result.error);
        }
        return;
      }

      setSuccessCode(result.data.publicCode);
    } catch {
      toast.error("Une erreur est survenue. Veuillez réessayer.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
    {/* ── Popup de confirmation ── */}
    {successCode && redirectTo && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
        <div className="relative w-full max-w-sm rounded-2xl bg-background p-8 shadow-xl space-y-4">
          <button
            type="button"
            onClick={() => router.push(redirectTo)}
            className="absolute right-4 top-4 rounded-md p-1 text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Fermer"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100 text-green-600">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
          </div>
          <div className="space-y-1">
            <p className="font-semibold text-lg">Demande enregistrée !</p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Votre réservation a bien été prise en compte. Vous serez recontactée
              très prochainement pour confirmation.
            </p>
          </div>
          <p className="text-xs text-muted-foreground">
            Fermeture automatique dans {countdown} seconde{countdown > 1 ? "s" : ""}…
          </p>
        </div>
      </div>
    )}
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8" noValidate>
      {/* Erreur créneau indisponible */}
      {slotError && (
        <div className="rounded-xl border border-destructive bg-destructive/10 p-4 text-sm text-destructive">
          <p className="font-medium">Créneau indisponible</p>
          <p className="mt-1">{slotError} Veuillez revenir en arrière et choisir un autre créneau.</p>
        </div>
      )}

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
        {selectedProducts.length > 0 && (
          <div className="pt-2 mt-2 border-t space-y-1">
            {selectedProducts.map((sp) => {
              const p = availableProducts.find((pr) => pr.id === sp.productId);
              if (!p) return null;
              return (
                <p key={sp.productId} className="text-muted-foreground flex justify-between">
                  <span>{p.name} × {sp.quantity}</span>
                  <span className="font-medium text-foreground">{formatPrice(p.priceCents * sp.quantity)}</span>
                </p>
              );
            })}
            <p className="flex justify-between font-semibold text-foreground border-t pt-1 mt-1">
              <span>Total</span>
              <span>{formatPrice(grandTotal)}</span>
            </p>
          </div>
        )}
      </div>

      {/* ── Vos informations ── */}
      <div className="space-y-5">
        <p className="text-sm font-semibold">Vos informations</p>

        <div className="space-y-1.5">
          <Label htmlFor="firstName">Prénom</Label>
          <Input
            id="firstName"
            autoComplete="given-name"
            aria-invalid={!!errors.firstName}
            disabled={isSubmitting}
            {...register("firstName")}
          />
          {errors.firstName && (
            <p className="text-xs text-destructive">{errors.firstName.message}</p>
          )}
        </div>

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
              disabled={isSubmitting}
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

        <div className="space-y-1.5">
          <Label htmlFor="notes">
            Notes{" "}
            <span className="text-muted-foreground font-normal">(optionnel, 500 car. max)</span>
          </Label>
          <textarea
            id="notes"
            rows={3}
            aria-invalid={!!errors.notes}
            disabled={isSubmitting}
            {...register("notes")}
            className={cn(
              "flex min-h-[72px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
              "disabled:cursor-not-allowed disabled:opacity-50 resize-none"
            )}
            placeholder="Longueur des cheveux, couleur souhaitée…"
          />
          {errors.notes && (
            <p className="text-xs text-destructive">{errors.notes.message}</p>
          )}
        </div>
      </div>

      {/* ── Paiement ── */}
      <div className="space-y-5">
        <p className="text-sm font-semibold">Paiement</p>

        {paypalLink && (
          <div className="rounded-xl border bg-blue-50 dark:bg-blue-950/30 p-4 space-y-3">
            <p className="text-xs text-muted-foreground leading-relaxed">
              Cliquez sur le bouton ci-dessous pour payer via PayPal, puis renseignez
              votre référence de transaction ou joignez une capture d&apos;écran ci-dessous.
            </p>
            <a
              href={paypalLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg bg-[#0070ba] hover:bg-[#005ea6] px-5 py-2.5 text-sm font-semibold text-white transition-colors"
            >
              Payer via PayPal →
            </a>
          </div>
        )}

        <p className="text-xs text-muted-foreground leading-relaxed">
          Renseignez votre référence de paiement (ex : numéro de transaction PayPal)
          et/ou joignez une capture d&apos;écran de la confirmation.
          <span className="font-medium text-foreground"> Au moins l&apos;un des deux est requis.</span>
        </p>

        <div className="space-y-1.5">
          <Label htmlFor="reference">Référence de paiement</Label>
          <Input
            id="reference"
            placeholder="Ex : 1AB23456CD789012E"
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            disabled={isSubmitting}
          />
        </div>

        <div className="space-y-1.5">
          <Label>Capture d&apos;écran du paiement</Label>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,.pdf"
            className="hidden"
            onChange={handleFileChange}
            disabled={isUploading || isSubmitting}
          />
          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading || isSubmitting}
            >
              {isUploading ? "Upload en cours…" : "Choisir un fichier"}
            </Button>
            {fileName && (
              <span className="text-sm text-muted-foreground truncate max-w-[200px]">
                {proofUrl ? "✓ " : isUploading ? "⏳ " : ""}{fileName}
              </span>
            )}
          </div>
          {proofUrl && (
            <a
              href={proofUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-primary underline underline-offset-2"
            >
              Voir la capture uploadée
            </a>
          )}
        </div>
      </div>

      <Button
        type="submit"
        size="lg"
        className="w-full"
        disabled={!canSubmit || isSubmitting}
      >
        {isSubmitting ? "Validation en cours…" : "Valider"}
      </Button>
    </form>
    </>
  );
}
