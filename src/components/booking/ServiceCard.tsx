'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { parsePriceMatrix, getMinPriceCents, getMinExtensionPriceCents, hasExtensionPricing } from '@/schemas/priceMatrix';
import { ImageLightbox } from '@/components/booking/ImageLightbox';

type Props = {
  service: {
    slug: string;
    name: string;
    description: string;
    durationMinutes: number;
    priceCents: number;
    priceWithExtensionCents: number | null;
    priceMatrix: string | null;
    images: { url: string }[];
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
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const firstImage = service.images[0];
  const hasImages = service.images.length > 0;

  const lightboxImages = service.images.map((img) => ({ url: img.url, alt: service.name }));

  return (
    <>
      <Card className="group flex flex-col overflow-hidden border-0 shadow-md transition-shadow duration-300 hover:shadow-xl">
        {/* Image cliquable */}
        <div
          className={cn(
            'relative aspect-[4/3] w-full overflow-hidden bg-muted',
            hasImages && 'cursor-zoom-in',
          )}
          onClick={() => hasImages && setLightboxOpen(true)}
          role={hasImages ? 'button' : undefined}
          aria-label={hasImages ? `Agrandir les photos de ${service.name}` : undefined}
          tabIndex={hasImages ? 0 : undefined}
          onKeyDown={(e) => {
            if (hasImages && (e.key === 'Enter' || e.key === ' ')) setLightboxOpen(true);
          }}
        >
          {firstImage ? (
            <>
              <Image
                src={firstImage.url}
                alt={service.name}
                fill
                className="object-cover transition-transform duration-500 group-hover:scale-105"
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              />
              {service.images.length > 1 && (
                <span className="absolute bottom-2 right-2 rounded-full bg-black/50 px-2 py-0.5 text-xs text-white backdrop-blur-sm">
                  {service.images.length} photos
                </span>
              )}
            </>
          ) : (
            <div className="flex h-full items-center justify-center bg-gradient-to-br from-rose-50 to-pink-100">
              <span className="text-5xl text-rose-300">✂</span>
            </div>
          )}
        </div>

        <CardContent className="flex flex-1 flex-col gap-2 p-5">
          <h3 className="text-lg font-semibold leading-tight text-zinc-900">{service.name}</h3>
          <p className="line-clamp-2 text-sm text-zinc-500">{service.description}</p>
          <div className="mt-auto pt-3 space-y-1">
            <span className="text-sm text-zinc-400">{formatDuration(service.durationMinutes)}</span>
            {(() => {
              const matrix = parsePriceMatrix(service.priceMatrix);
              // Grille avec extension
              if (matrix && hasExtensionPricing(matrix)) {
                const minSans = getMinPriceCents(matrix);
                const minAvec = getMinExtensionPriceCents(matrix);
                return (
                  <div className="space-y-0.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-zinc-500">Sans extension</span>
                      <span className="text-sm font-semibold text-zinc-800">à partir de {formatPrice(minSans)}</span>
                    </div>
                    {minAvec !== null && (
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-zinc-500">Avec extension</span>
                        <span className="text-sm font-semibold text-rose-600">à partir de {formatPrice(minAvec)}</span>
                      </div>
                    )}
                  </div>
                );
              }
              // Prix fixe avec extension
              if (service.priceWithExtensionCents) {
                return (
                  <div className="space-y-0.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-zinc-500">Sans extension</span>
                      <span className="text-sm font-semibold text-zinc-800">{formatPrice(service.priceCents)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-zinc-500">Avec extension</span>
                      <span className="text-sm font-semibold text-rose-600">{formatPrice(service.priceWithExtensionCents)}</span>
                    </div>
                  </div>
                );
              }
              // Prix unique ou grille sans extension
              return (
                <div className="flex items-center justify-between">
                  <span />
                  <span className="text-lg font-bold text-rose-600">
                    {matrix ? `À partir de ${formatPrice(getMinPriceCents(matrix))}` : formatPrice(service.priceCents)}
                  </span>
                </div>
              );
            })()}
          </div>
        </CardContent>

        <CardFooter className="p-5 pt-0">
          <Button asChild className="w-full">
            <Link href={`/reserver/${service.slug}`}>Réserver →</Link>
          </Button>
        </CardFooter>
      </Card>

      {lightboxOpen && (
        <ImageLightbox
          images={lightboxImages}
          onClose={() => setLightboxOpen(false)}
        />
      )}
    </>
  );
}

function cn(...classes: (string | undefined | false)[]) {
  return classes.filter(Boolean).join(' ');
}
