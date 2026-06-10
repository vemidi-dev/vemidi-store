"use client";

import Image from "next/image";
import { useState, useTransition } from "react";

import { loadMoreEventGalleryImages } from "@/app/events/gallery-actions";
import type { EventGalleryImage } from "@/lib/content/event-gallery";

type EventGalleryGridProps = {
  initialImages: EventGalleryImage[];
  totalCount: number;
};

export function EventGalleryGrid({
  initialImages,
  totalCount,
}: EventGalleryGridProps) {
  const [images, setImages] = useState(initialImages);
  const [isPending, startTransition] = useTransition();
  const hasMore = images.length < totalCount;

  return (
    <div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 lg:gap-4">
        {images.map((image) => (
          <figure
            key={image.id}
            className="group relative overflow-hidden rounded-2xl border border-boutique-line bg-white shadow-boutique-sm"
          >
            <div className="relative aspect-[4/5]">
              <Image
                src={image.imageUrl}
                alt={image.altText}
                fill
                sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                className="object-cover transition duration-500 group-hover:scale-[1.03]"
              />
            </div>
          </figure>
        ))}
      </div>

      {hasMore ? (
        <div className="mt-8 text-center">
          <button
            type="button"
            disabled={isPending}
            onClick={() => {
              startTransition(async () => {
                const nextImages = await loadMoreEventGalleryImages(images.length);
                if (nextImages.length > 0) {
                  setImages((current) => [...current, ...nextImages]);
                }
              });
            }}
            className="rounded-full border border-boutique-line bg-white px-6 py-3 text-sm font-semibold text-boutique-ink transition hover:border-boutique-rose-deep hover:text-boutique-rose-deep disabled:opacity-60"
          >
            {isPending
              ? "Зареждане..."
              : `Покажи още (${images.length} от ${totalCount})`}
          </button>
        </div>
      ) : null}
    </div>
  );
}
