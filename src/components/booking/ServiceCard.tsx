import Image from 'next/image';
import Link from 'next/link';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

type Props = {
  service: {
    slug: string;
    name: string;
    description: string;
    durationMinutes: number;
    priceCents: number;
    imageUrl: string | null;
  };
};

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h} h ${m.toString().padStart(2, '0')}` : `${h} h`;
}

function formatPrice(cents: number): string {
  return (cents / 100).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' });
}

export function ServiceCard({ service }: Props) {
  return (
    <Card className="flex flex-col overflow-hidden">
      <div className="relative aspect-[4/3] w-full bg-muted">
        {service.imageUrl ? (
          <Image
            src={service.imageUrl}
            alt={service.name}
            fill
            className="object-cover"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-gradient-to-br from-rose-50 to-pink-100">
            <span className="text-4xl text-rose-200">✂</span>
          </div>
        )}
      </div>

      <CardContent className="flex flex-1 flex-col gap-2 p-4">
        <h3 className="font-semibold leading-tight">{service.name}</h3>
        <p className="line-clamp-2 text-sm text-muted-foreground">{service.description}</p>
        <div className="mt-auto flex items-center gap-3 pt-2 text-sm text-muted-foreground">
          <span>{formatDuration(service.durationMinutes)}</span>
          <span className="text-foreground font-medium">{formatPrice(service.priceCents)}</span>
        </div>
      </CardContent>

      <CardFooter className="p-4 pt-0">
        <Button asChild className="w-full">
          <Link href={`/reserver/${service.slug}`}>Réserver</Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
