import Link from 'next/link';
import { Button } from '@/components/ui/button';

const businessName = process.env.NEXT_PUBLIC_BUSINESS_NAME ?? 'Salon';

export default function HomePage() {
  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-zinc-950">
      {/* Glow ambiance */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 right-0 h-[700px] w-[700px] rounded-full bg-rose-500/15 blur-[130px]" />
        <div className="absolute bottom-0 -left-40 h-[500px] w-[500px] rounded-full bg-rose-900/20 blur-[120px]" />
      </div>

      {/* Header */}
      <header className="relative z-10 border-b border-white/10">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
          <span className="text-lg font-bold tracking-tight text-white">
            <span className="text-rose-400">{businessName.charAt(0)}</span>
            {businessName.slice(1)}
          </span>
          <nav className="flex items-center gap-6">
            <Link
              href="/prestations"
              className="text-sm font-medium text-zinc-400 transition-colors hover:text-white"
            >
              Prestations
            </Link>
            <Link
              href="/ma-reservation"
              className="text-sm font-medium text-zinc-400 transition-colors hover:text-white"
            >
              Ma réservation
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <main className="relative z-10 flex flex-1 flex-col items-center justify-center px-4 py-24 text-center">
        <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-rose-500/30 bg-rose-500/10 px-4 py-1.5 text-sm text-rose-300">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-rose-400" />
          Réservation en ligne disponible
        </div>

        <h1 className="max-w-3xl text-5xl font-bold leading-tight tracking-tight text-white sm:text-6xl lg:text-7xl">
          Votre beauté,{' '}
          <span className="bg-gradient-to-r from-rose-400 to-pink-400 bg-clip-text text-transparent">
            notre passion
          </span>
        </h1>

        <p className="mt-6 max-w-xl text-lg text-zinc-400 sm:text-xl">
          Tresses, tissage, brushing, soins de cheveux — réservez votre créneau en quelques clics.
        </p>

        <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
          <Button
            asChild
            size="lg"
            className="bg-rose-500 px-8 text-base text-white shadow-lg shadow-rose-500/25 hover:bg-rose-600"
          >
            <Link href="/prestations">Voir nos prestations</Link>
          </Button>
          <Link
            href="/ma-reservation"
            className="text-sm text-zinc-500 underline-offset-4 transition-colors hover:text-zinc-300 hover:underline"
          >
            Suivre ma réservation
          </Link>
        </div>

        {/* Stats déco */}
        <div className="mt-20 flex flex-wrap justify-center gap-12">
          {[
            { label: 'Prestations', value: '6+' },
            { label: 'Réservation en ligne', value: '24/7' },
            { label: 'Satisfaction clients', value: '100%' },
          ].map(({ label, value }) => (
            <div key={label} className="text-center">
              <p className="text-3xl font-bold text-white">{value}</p>
              <p className="mt-1 text-sm text-zinc-500">{label}</p>
            </div>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/10 py-6 text-center text-sm text-zinc-600">
        <p>
          &copy; {new Date().getFullYear()} {businessName}
          {' · '}
          <Link href="/mentions-legales" className="transition-colors hover:text-zinc-400">
            Mentions légales
          </Link>
        </p>
      </footer>
    </div>
  );
}
