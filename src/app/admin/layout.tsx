import Link from 'next/link';
import { requireAdmin } from '@/lib/auth';
import { signOut } from '@/lib/auth';
import { Button } from '@/components/ui/button';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <nav className="mx-auto flex max-w-7xl items-center gap-6 px-4 py-3">
          <span className="text-sm font-semibold">Admin</span>
          <div className="flex flex-1 items-center gap-4">
            <Link href="/admin/reservations" className="text-sm text-muted-foreground hover:text-foreground">
              Réservations
            </Link>
            <Link href="/admin/calendrier" className="text-sm text-muted-foreground hover:text-foreground">
              Calendrier
            </Link>
            <Link href="/admin/prestations" className="text-sm text-muted-foreground hover:text-foreground">
              Prestations
            </Link>
            <Link href="/admin/produits" className="text-sm text-muted-foreground hover:text-foreground">
              Skincare
            </Link>
            <Link href="/admin/parametres" className="text-sm text-muted-foreground hover:text-foreground">
              Paramètres
            </Link>
          </div>
          <form
            action={async () => {
              'use server';
              await signOut({ redirectTo: '/login' });
            }}
          >
            <Button type="submit" variant="ghost" size="sm">
              Déconnexion
            </Button>
          </form>
        </nav>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-8">{children}</main>
    </div>
  );
}
