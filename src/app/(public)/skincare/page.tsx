export const dynamic = 'force-dynamic'
import type { Metadata } from 'next';
import Link from 'next/link';
import { prisma } from '@/lib/db';

export const metadata: Metadata = { title: 'Produits' };

function formatPrice(cents: number) {
  return (cents / 100).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' });
}

export default async function ProduitsPage() {
  const products = await prisma.product.findMany({
    where: { active: true },
    orderBy: { sortOrder: 'asc' },
  });

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <div className="mb-8 space-y-1">
        <h1 className="text-2xl font-semibold">Produits cosmétiques</h1>
        <p className="text-sm text-muted-foreground">
          Commandez lors de votre réservation — produits remis le jour de votre rendez-vous.
        </p>
      </div>

      {products.length === 0 ? (
        <p className="text-sm text-muted-foreground">Aucun produit disponible pour le moment.</p>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((p) => (
            <div key={p.id} className="rounded-xl border bg-card overflow-hidden">
              {p.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.imageUrl} alt={p.name} className="h-52 w-full object-cover" />
              ) : (
                <div className="h-52 w-full bg-muted flex items-center justify-center text-muted-foreground text-sm">
                  Pas d&apos;image
                </div>
              )}
              <div className="p-4 space-y-1">
                <p className="font-medium">{p.name}</p>
                {p.description && (
                  <p className="text-sm text-muted-foreground leading-snug">{p.description}</p>
                )}
                <p className="text-sm font-semibold">{formatPrice(p.priceCents)}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-10 text-center">
        <p className="text-sm text-muted-foreground mb-3">
          Vous pouvez ajouter des produits directement lors de votre réservation.
        </p>
        <Link
          href="/prestations"
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          Réserver une prestation →
        </Link>
      </div>
    </div>
  );
}
