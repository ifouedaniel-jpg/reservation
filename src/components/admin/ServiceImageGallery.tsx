'use client';

import { useTransition } from 'react';
import Image from 'next/image';
import { deleteServiceImage } from '@/server/actions/service';

type Props = {
  images: { id: string; url: string; order: number }[];
};

export function ServiceImageGallery({ images }: Props) {
  const [isPending, startTransition] = useTransition();

  if (images.length === 0) return null;

  function handleDelete(imageId: string) {
    startTransition(async () => {
      await deleteServiceImage(imageId);
    });
  }

  return (
    <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
      {images.map((img) => (
        <div key={img.id} className="group relative aspect-square overflow-hidden rounded-md border bg-muted">
          <Image src={img.url} alt="" fill className="object-cover" sizes="150px" />
          <button
            type="button"
            onClick={() => handleDelete(img.id)}
            disabled={isPending}
            className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white opacity-0 transition-opacity group-hover:opacity-100 hover:bg-black/80 disabled:cursor-wait"
            aria-label="Supprimer cette image"
          >
            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      ))}
    </div>
  );
}
