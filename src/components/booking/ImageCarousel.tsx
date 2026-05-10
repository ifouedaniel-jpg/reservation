'use client';

import { useState } from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';

type CarouselImage = { url: string; alt: string };

type Props = {
  images: CarouselImage[];
  aspectClass?: string;
};

export function ImageCarousel({ images, aspectClass = 'aspect-[16/7]' }: Props) {
  const [current, setCurrent] = useState(0);

  if (images.length === 0) {
    return (
      <div className={cn('relative w-full bg-muted', aspectClass)}>
        <div className="flex h-full items-center justify-center bg-gradient-to-br from-rose-50 to-pink-100">
          <span className="text-6xl text-rose-200">✂</span>
        </div>
      </div>
    );
  }

  if (images.length === 1) {
    return (
      <div className={cn('relative w-full overflow-hidden', aspectClass)}>
        <Image src={images[0].url} alt={images[0].alt} fill className="object-cover" priority sizes="(max-width: 768px) 100vw, 768px" />
      </div>
    );
  }

  const prev = () => setCurrent((i) => (i - 1 + images.length) % images.length);
  const next = () => setCurrent((i) => (i + 1) % images.length);

  return (
    <div className={cn('group relative w-full overflow-hidden', aspectClass)}>
      {/* Slides */}
      {images.map((img, i) => (
        <div
          key={i}
          className={cn(
            'absolute inset-0 transition-opacity duration-400',
            i === current ? 'opacity-100' : 'opacity-0 pointer-events-none',
          )}
        >
          <Image src={img.url} alt={img.alt} fill className="object-cover" priority={i === 0} sizes="(max-width: 768px) 100vw, 768px" />
        </div>
      ))}

      {/* Prev / Next */}
      <button
        type="button"
        onClick={prev}
        aria-label="Image précédente"
        className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-black/40 p-2 text-white opacity-0 transition-opacity group-hover:opacity-100 hover:bg-black/60"
      >
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      </button>
      <button
        type="button"
        onClick={next}
        aria-label="Image suivante"
        className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-black/40 p-2 text-white opacity-0 transition-opacity group-hover:opacity-100 hover:bg-black/60"
      >
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>

      {/* Dots */}
      <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
        {images.map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setCurrent(i)}
            aria-label={`Image ${i + 1}`}
            className={cn(
              'h-1.5 rounded-full transition-all',
              i === current ? 'w-4 bg-white' : 'w-1.5 bg-white/50 hover:bg-white/80',
            )}
          />
        ))}
      </div>

      {/* Counter */}
      <span className="absolute right-3 bottom-3 rounded-full bg-black/40 px-2 py-0.5 text-xs text-white">
        {current + 1} / {images.length}
      </span>
    </div>
  );
}
