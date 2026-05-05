import Link from 'next/link';

const businessName = process.env.NEXT_PUBLIC_BUSINESS_NAME ?? 'Salon';

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <Link href="/" className="text-base font-semibold tracking-tight">
            {businessName}
          </Link>
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

      <main className="flex-1">{children}</main>

      <footer className="border-t py-6 text-center text-sm text-muted-foreground">
        <div className="mx-auto max-w-5xl px-4">
          <p>
            &copy; {new Date().getFullYear()} {businessName}
            {' · '}
            <Link href="/mentions-legales" className="hover:underline">
              Mentions légales
            </Link>
            {' · '}
            <Link href="/confidentialite" className="hover:underline">
              Politique de confidentialité
            </Link>
          </p>
        </div>
      </footer>
    </div>
  );
}
