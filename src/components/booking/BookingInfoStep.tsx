"use client";

import { useEffect } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const infoSchema = z.object({
  firstName: z.string().min(1, "Prénom requis"),
  phone: z.string().regex(/^\+\d{10,15}$/, "Numéro invalide (ex : +33612345678)"),
  notes: z.string().max(500, "500 caractères maximum").optional(),
});

export type InfoData = z.infer<typeof infoSchema>;

type Props = {
  onComplete: (data: InfoData) => void;
};

export default function BookingInfoStep({ onComplete }: Props) {
  const {
    register,
    setValue,
    control,
    formState: { errors, isValid },
  } = useForm<InfoData>({
    resolver: zodResolver(infoSchema),
    mode: "onChange",
  });

  const firstName = useWatch({ control, name: "firstName" });
  const phone = useWatch({ control, name: "phone" });
  const notes = useWatch({ control, name: "notes" });

  useEffect(() => {
    if (isValid) {
      onComplete({ firstName, phone, notes });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isValid, firstName, phone, notes]);

  return (
    <div className="rounded-xl border bg-card p-6 space-y-5">
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
            "disabled:cursor-not-allowed disabled:opacity-50 resize-none"
          )}
          placeholder="Longueur des cheveux, couleur souhaitée…"
        />
        {errors.notes && (
          <p className="text-xs text-destructive">{errors.notes.message}</p>
        )}
      </div>
    </div>
  );
}
