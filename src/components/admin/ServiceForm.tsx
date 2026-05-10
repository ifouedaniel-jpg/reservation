'use client';

import { useActionState, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PriceMatrixBuilder } from '@/components/admin/PriceMatrixBuilder';
import { ServiceImageGallery } from '@/components/admin/ServiceImageGallery';
import { parsePriceMatrix } from '@/schemas/priceMatrix';

type ActionState = { ok: false; error: string } | null;
type ServiceImage = { id: string; url: string; order: number };

type ServiceData = {
  id: string;
  name: string;
  description: string;
  durationMinutes: number;
  priceCents: number;
  active: boolean;
  sortOrder: number;
  priceMatrix: string | null;
  images: ServiceImage[];
};

type Props = {
  action: (prevState: ActionState, formData: FormData) => Promise<ActionState>;
  service?: ServiceData;
};

export function ServiceForm({ action, service }: Props) {
  const [state, formAction, isPending] = useActionState(action, null);

  const initialHasGrid = !!parsePriceMatrix(service?.priceMatrix ?? null);
  const [isGrid, setIsGrid] = useState(initialHasGrid);

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
        {/* Durée : visible uniquement en mode prix fixe */}
        {!isGrid && (
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
        )}
        {isGrid && (
          /* Champ caché pour satisfaire la validation serveur */
          <input type="hidden" name="durationMinutes" value={service?.durationMinutes ?? 0} />
        )}

        <div className="space-y-2">
          <Label htmlFor="priceEuros">Prix de base (€)</Label>
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
          <Input id="sortOrder" name="sortOrder" type="number" min={0} defaultValue={service?.sortOrder ?? 0} />
        </div>
        <div className="flex items-end pb-1">
          <label className="flex cursor-pointer items-center gap-2">
            <input type="checkbox" name="active" value="on" defaultChecked={service ? service.active : true} className="h-4 w-4 rounded" />
            <span className="text-sm font-medium">Active</span>
          </label>
        </div>
      </div>

      <PriceMatrixBuilder
        initialJson={service?.priceMatrix ?? null}
        onTypeChange={(t) => setIsGrid(t === 'grid')}
      />

      {/* Images */}
      <div className="space-y-3">
        <Label>Photos</Label>
        {service && service.images.length > 0 && <ServiceImageGallery images={service.images} />}
        <Input id="images" name="images" type="file" accept="image/*" multiple />
        <p className="text-xs text-muted-foreground">
          {service?.images && service.images.length > 0
            ? 'Sélectionner des fichiers pour ajouter des photos. Survoler une photo pour la supprimer.'
            : 'Formats acceptés : JPG, PNG, WebP. Vous pouvez sélectionner plusieurs photos.'}
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
