import Link from 'next/link';
import { Button } from '@/components/ui/button';

const businessName = process.env.NEXT_PUBLIC_BUSINESS_NAME ?? 'Salon';

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <span className="text-base font-semibold tracking-tight">{businessName}</span>
          <nav className="flex items-center gap-6">
            <Link
              href="/prestations"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Prestations
            </Link>
            <Link
              href="/ma-reservation"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Ma réservation
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center px-4 py-20">
        <div className="max-w-lg space-y-6 text-center">
          <h1 className="text-4xl font-semibold leading-tight tracking-tight">
            Prenez soin de vous
          </h1>
          <p className="text-lg text-muted-foreground">
            Réservez votre prestation en quelques clics, directement en ligne.
          </p>
          <Button asChild size="lg">
            <Link href="/prestations">Voir nos prestations</Link>
          </Button>
        </div>
      </main>

      <footer className="border-t py-6 text-center text-sm text-muted-foreground">
        <p>
          &copy; {new Date().getFullYear()} {businessName}
          {' · '}
          <Link href="/mentions-legales" className="hover:underline">
            Mentions légales
          </Link>
        </p>
      </footer>
    </div>
  );
}
