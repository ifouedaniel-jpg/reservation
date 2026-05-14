import Link from 'next/link';
import ProductForm from '@/components/admin/ProductForm';

export default function NouveauProduitPage() {
  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/produits" className="text-sm text-muted-foreground hover:text-foreground">
          ← Produits
        </Link>
        <h1 className="text-2xl font-semibold mt-2">Nouveau produit</h1>
      </div>
      <ProductForm />
    </div>
  );
}
