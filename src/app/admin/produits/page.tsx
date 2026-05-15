export const dynamic = 'force-dynamic'
import Link from 'next/link';
import { prisma } from '@/lib/db';
import { Button } from '@/components/ui/button';
import { DeleteProductButton, ToggleProductButton } from '@/components/admin/ProductButtons';

function formatPrice(cents: number) {
  return (cents / 100).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' });
}

export default async function AdminProduitsPage() {
  const products = await prisma.product.findMany({
    orderBy: [{ active: 'desc' }, { sortOrder: 'asc' }],
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Produits cosmétiques</h1>
        <Button asChild>
          <Link href="/admin/produits/nouveau">Nouveau produit</Link>
        </Button>
      </div>

      {products.length === 0 ? (
        <p className="text-muted-foreground">Aucun produit pour le moment.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 text-left font-medium">Image</th>
                <th className="px-4 py-3 text-left font-medium">Nom</th>
                <th className="px-4 py-3 text-left font-medium">Prix</th>
                <th className="px-4 py-3 text-left font-medium">Ordre</th>
                <th className="px-4 py-3 text-left font-medium">Statut</th>
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id} className="border-b last:border-0 hover:bg-muted/30">
                  <td className="px-4 py-3">
                    {p.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.imageUrl} alt={p.name} className="h-12 w-12 rounded-md object-cover border" />
                    ) : (
                      <div className="h-12 w-12 rounded-md bg-muted" />
                    )}
                  </td>
                  <td className="px-4 py-3 font-medium">
                    <p>{p.name}</p>
                    {p.description && (
                      <p className="text-xs text-muted-foreground truncate max-w-xs">{p.description}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{formatPrice(p.priceCents)}</td>
                  <td className="px-4 py-3 text-muted-foreground">{p.sortOrder}</td>
                  <td className="px-4 py-3">
                    <span className={
                      p.active
                        ? 'rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700'
                        : 'rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500'
                    }>
                      {p.active ? 'Actif' : 'Inactif'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/admin/produits/${p.id}`}>Éditer</Link>
                      </Button>
                      <ToggleProductButton id={p.id} active={p.active} />
                      <DeleteProductButton id={p.id} name={p.name} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
