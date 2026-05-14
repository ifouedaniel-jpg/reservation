import Link from 'next/link';

const businessName = process.env.NEXT_PUBLIC_BUSINESS_NAME ?? 'Salon';

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-10 border-b border-rose-100 bg-white/95 shadow-sm backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <Link
            href="/"
            className="text-lg font-bold tracking-tight text-zinc-900 transition-colors hover:text-rose-600"
          >
            {businessName}
          </Link>
          <nav className="flex items-center gap-6">
            <Link
              href="/prestations"
              className="text-sm font-medium text-zinc-600 transition-colors hover:text-rose-600"
            >
              Prestations
            </Link>
            <Link
              href="/skincare"
              className="text-sm font-medium text-zinc-600 transition-colors hover:text-rose-600"
            >
              Skincare
            </Link>
            <Link
              href="/ma-reservation"
              className="text-sm font-medium text-zinc-600 transition-colors hover:text-rose-600"
            >
              Ma réservation
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t bg-zinc-950 py-8 text-sm text-zinc-500">
        <div className="mx-auto max-w-5xl px-4 text-center">
          <p className="mb-2 font-semibold text-white">{businessName}</p>
          <p>&copy; {new Date().getFullYear()} {businessName}</p>
        </div>
      </footer>
    </div>
  );
}
