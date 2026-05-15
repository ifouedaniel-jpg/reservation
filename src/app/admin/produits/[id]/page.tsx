export const dynamic = 'force-dynamic'
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import ProductForm from '@/components/admin/ProductForm';

type Props = { params: Promise<{ id: string }> };

export default async function EditProduitPage({ params }: Props) {
  const { id } = await params;

  const product = await prisma.product.findUnique({ where: { id } });
  if (!product) notFound();

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/produits" className="text-sm text-muted-foreground hover:text-foreground">
          ← Produits
        </Link>
        <h1 className="text-2xl font-semibold mt-2">Éditer — {product.name}</h1>
      </div>
      <ProductForm product={product} />
    </div>
  );
}
