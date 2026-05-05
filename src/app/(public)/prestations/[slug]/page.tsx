import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { Button } from '@/components/ui/button';

type Props = { params: Promise<{ slug: string }> };

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h} h ${m.toString().padStart(2, '0')}` : `${h} h`;
}

function formatPrice(cents: number): string {
  return (cents / 100).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' });
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const service = await prisma.service.findUnique({ where: { slug } });
  if (!service) return {};
  return { title: service.name };
}

export default async function ServiceDetailPage({ params }: Props) {
  const { slug } = await params;
  const service = await prisma.service.findUnique({
    where: { slug, active: true },
  });

  if (!service) notFound();

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <Link
        href="/prestations"
        className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        ← Toutes les prestations
      </Link>

      <div className="overflow-hidden rounded-xl border">
        <div className="relative aspect-[16/7] w-full bg-muted">
          {service.imageUrl ? (
            <Image
              src={service.imageUrl}
              alt={service.name}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 768px"
              priority
            />
          ) : (
            <div className="flex h-full items-center justify-center bg-gradient-to-br from-rose-50 to-pink-100">
              <span className="text-6xl text-rose-200">✂</span>
            </div>
          )}
        </div>

        <div className="space-y-4 p-6">
          <h1 className="text-2xl font-semibold">{service.name}</h1>
          <p className="text-muted-foreground leading-relaxed">{service.description}</p>

          <div className="flex flex-wrap gap-4 border-t pt-4 text-sm">
            <div>
              <span className="text-muted-foreground">Durée</span>
              <p className="font-medium">{formatDuration(service.durationMinutes)}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Tarif</span>
              <p className="font-medium">{formatPrice(service.priceCents)}</p>
            </div>
          </div>

          <Button asChild size="lg" className="w-full sm:w-auto">
            <Link href={`/reserver/${service.slug}`}>Réserver cette prestation</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
