'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import type { SelectedProduct } from '@/schemas/booking';

type Product = {
  id: string;
  name: string;
  description: string | null;
  priceCents: number;
  imageUrl: string | null;
};

type Props = {
  products: Product[];
  onNext: (selected: SelectedProduct[]) => void;
};

function formatPrice(cents: number) {
  return (cents / 100).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' });
}

export default function ProductPicker({ products, onNext }: Props) {
  const [quantities, setQuantities] = useState<Record<string, number>>({});

  const selected = Object.entries(quantities)
    .filter(([, qty]) => qty > 0)
    .map(([productId, quantity]) => ({ productId, quantity }));

  const total = selected.reduce((sum, { productId, quantity }) => {
    const p = products.find((pr) => pr.id === productId);
    return sum + (p?.priceCents ?? 0) * quantity;
  }, 0);

  function setQty(id: string, qty: number) {
    setQuantities((prev) => ({ ...prev, [id]: Math.max(0, qty) }));
  }

  if (products.length === 0) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">Aucun produit disponible actuellement.</p>
        <Button onClick={() => onNext([])}>Continuer sans produit →</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Sélectionnez les produits que vous souhaitez recevoir lors de votre rendez-vous.
        Cette étape est optionnelle.
      </p>

      <div className="space-y-3">
        {products.map((p) => {
          const qty = quantities[p.id] ?? 0;
          return (
            <div key={p.id} className="flex items-center gap-4 rounded-xl border p-4">
              {p.imageUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={p.imageUrl}
                  alt={p.name}
                  className="h-16 w-16 rounded-lg object-cover shrink-0"
                />
              )}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm">{p.name}</p>
                {p.description && (
                  <p className="text-xs text-muted-foreground leading-snug mt-0.5">{p.description}</p>
                )}
                <p className="text-sm font-semibold mt-1">{formatPrice(p.priceCents)}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setQty(p.id, qty - 1)}
                  disabled={qty === 0}
                  className="h-8 w-8 rounded-full border text-lg font-bold hover:bg-muted disabled:opacity-30 transition-colors"
                >
                  −
                </button>
                <span className="w-6 text-center text-sm font-medium">{qty}</span>
                <button
                  type="button"
                  onClick={() => setQty(p.id, qty + 1)}
                  className="h-8 w-8 rounded-full border text-lg font-bold hover:bg-muted transition-colors"
                >
                  +
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {total > 0 && (
        <div className="flex justify-between text-sm font-medium border-t pt-3">
          <span>Total produits</span>
          <span>{formatPrice(total)}</span>
        </div>
      )}

      <div className="flex flex-col gap-2">
        <Button onClick={() => onNext(selected)} className="w-full">
          {selected.length > 0 ? `Ajouter ${selected.length} produit${selected.length > 1 ? 's' : ''} →` : 'Continuer sans produit →'}
        </Button>
      </div>
    </div>
  );
}
