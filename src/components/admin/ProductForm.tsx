'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createProductAction, updateProductAction } from '@/server/actions/product';

type Props = {
  product?: {
    id: string;
    name: string;
    description: string | null;
    priceCents: number;
    imageUrl: string | null;
    sortOrder: number;
    active: boolean;
  };
};

export default function ProductForm({ product }: Props) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState(product?.name ?? '');
  const [description, setDescription] = useState(product?.description ?? '');
  const [price, setPrice] = useState(product ? String(product.priceCents / 100) : '');
  const [sortOrder, setSortOrder] = useState(String(product?.sortOrder ?? 0));
  const [active, setActive] = useState(product?.active ?? true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const priceNum = Math.round(parseFloat(price) * 100);
    if (isNaN(priceNum) || priceNum < 1) {
      toast.error('Prix invalide');
      return;
    }

    const data = {
      name: name.trim(),
      description: description.trim() || undefined,
      priceCents: priceNum,
      sortOrder: parseInt(sortOrder) || 0,
      active,
    };

    let imageFormData: FormData | undefined;
    if (fileRef.current?.files?.[0]) {
      imageFormData = new FormData();
      imageFormData.append('image', fileRef.current.files[0]);
    }

    setIsSubmitting(true);
    try {
      const result = product
        ? await updateProductAction(product.id, data, imageFormData)
        : await createProductAction(data, imageFormData);

      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(product ? 'Produit mis à jour' : 'Produit créé');
      router.push('/admin/produits');
      router.refresh();
    } catch {
      toast.error('Une erreur est survenue');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 max-w-lg">
      <div className="space-y-1.5">
        <Label htmlFor="name">Nom</Label>
        <Input id="name" required value={name} onChange={(e) => setName(e.target.value)} disabled={isSubmitting} />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="description">
          Description{' '}
          <span className="text-muted-foreground font-normal">(optionnel)</span>
        </Label>
        <textarea
          id="description"
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          disabled={isSubmitting}
          className="flex min-h-[72px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 disabled:opacity-50 resize-none"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="price">Prix (€)</Label>
        <Input
          id="price"
          type="number"
          step="0.01"
          min="0.01"
          required
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          disabled={isSubmitting}
          placeholder="12.50"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="sortOrder">Ordre d&apos;affichage</Label>
        <Input
          id="sortOrder"
          type="number"
          min="0"
          value={sortOrder}
          onChange={(e) => setSortOrder(e.target.value)}
          disabled={isSubmitting}
        />
      </div>

      <div className="space-y-1.5">
        <Label>Image</Label>
        {product?.imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={product.imageUrl} alt={product.name} className="h-24 w-24 rounded-lg object-cover border" />
        )}
        <input ref={fileRef} type="file" accept="image/*" disabled={isSubmitting} className="text-sm" />
      </div>

      <div className="flex items-center gap-2">
        <input
          id="active"
          type="checkbox"
          checked={active}
          onChange={(e) => setActive(e.target.checked)}
          disabled={isSubmitting}
          className="h-4 w-4"
        />
        <Label htmlFor="active">Produit actif (visible sur le site)</Label>
      </div>

      <div className="flex gap-3">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Enregistrement…' : product ? 'Mettre à jour' : 'Créer le produit'}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.push('/admin/produits')} disabled={isSubmitting}>
          Annuler
        </Button>
      </div>
    </form>
  );
}
