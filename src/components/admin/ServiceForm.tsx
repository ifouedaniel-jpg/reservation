'use client';

import { useActionState, useState, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type ActionState = { ok: false; error: string } | null;

type ServiceData = {
  id: string;
  name: string;
  description: string;
  durationMinutes: number;
  priceCents: number;
  active: boolean;
  sortOrder: number;
  imageUrl: string | null;
};

type Props = {
  action: (prevState: ActionState, formData: FormData) => Promise<ActionState>;
  service?: ServiceData;
};

export function ServiceForm({ action, service }: Props) {
  const [state, formAction, isPending] = useActionState(action, null);
  const [preview, setPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      setPreview(URL.createObjectURL(file));
    } else {
      setPreview(null);
    }
  }

  const displayImage = preview ?? service?.imageUrl ?? null;
  const priceEuros = service ? (service.priceCents / 100).toFixed(2) : '';

  return (
    <form action={formAction} className="max-w-lg space-y-6">
      {state && !state.ok && (
        <p className="text-sm text-destructive">{state.error}</p>
      )}

      <div className="space-y-2">
        <Label htmlFor="name">Nom</Label>
        <Input id="name" name="name" required defaultValue={service?.name} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <textarea
          id="description"
          name="description"
          required
          defaultValue={service?.description}
          rows={3}
          className="border-input bg-background placeholder:text-muted-foreground focus-visible:ring-ring flex w-full rounded-md border px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="durationMinutes">Durée (min)</Label>
          <Input
            id="durationMinutes"
            name="durationMinutes"
            type="number"
            min={1}
            required
            defaultValue={service?.durationMinutes}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="priceEuros">Prix (€)</Label>
          <Input
            id="priceEuros"
            name="priceEuros"
            type="number"
            step="0.01"
            min="0.01"
            required
            defaultValue={priceEuros}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="sortOrder">Ordre d&apos;affichage</Label>
          <Input
            id="sortOrder"
            name="sortOrder"
            type="number"
            min={0}
            defaultValue={service?.sortOrder ?? 0}
          />
        </div>
        <div className="flex items-end pb-1">
          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              name="active"
              value="on"
              defaultChecked={service ? service.active : true}
              className="h-4 w-4 rounded"
            />
            <span className="text-sm font-medium">Active</span>
          </label>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="image">Image</Label>
        {displayImage && (
          <div className="relative h-40 w-40 overflow-hidden rounded-md border">
            <Image
              src={displayImage}
              alt="Aperçu"
              fill
              className="object-cover"
              unoptimized={!!preview}
            />
          </div>
        )}
        <Input
          ref={fileInputRef}
          id="image"
          name="image"
          type="file"
          accept="image/*"
          onChange={handleFileChange}
        />
        <p className="text-xs text-muted-foreground">
          {service?.imageUrl
            ? "Laisser vide pour conserver l'image actuelle."
            : 'Formats acceptés : JPG, PNG, WebP.'}
        </p>
      </div>

      <div className="flex gap-3">
        <Button type="submit" disabled={isPending}>
          {isPending ? 'Enregistrement…' : service ? 'Modifier' : 'Créer'}
        </Button>
        <Button variant="outline" asChild>
          <Link href="/admin/prestations">Annuler</Link>
        </Button>
      </div>
    </form>
  );
}
