"use client";

import { useMemo, useState } from "react";

import { EventGalleryImageTile } from "@/components/admin/event-gallery-image-tile";
import { ADMIN_EVENT_GALLERY_PAGE_SIZE } from "@/lib/images/constants";
import type { EventGalleryImageRow } from "@/lib/admin/types";

type EventGalleryAdminGridProps = {
  images: EventGalleryImageRow[];
};

export function EventGalleryAdminGrid({ images }: EventGalleryAdminGridProps) {
  const [visibleCount, setVisibleCount] = useState(ADMIN_EVENT_GALLERY_PAGE_SIZE);
  const visibleImages = useMemo(
    () => images.slice(0, visibleCount),
    [images, visibleCount],
  );
  const hasMore = visibleCount < images.length;

  return (
    <div>
      <div className="mt-4 grid grid-cols-3 gap-1.5 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10">
        {visibleImages.map((image, index) => (
          <EventGalleryImageTile
            image={image}
            index={index}
            isPrimary={index === 0}
            key={image.id}
            total={images.length}
          />
        ))}
      </div>

      {hasMore ? (
        <div className="mt-4 text-center">
          <button
            type="button"
            onClick={() =>
              setVisibleCount((current) =>
                Math.min(current + ADMIN_EVENT_GALLERY_PAGE_SIZE, images.length),
              )
            }
            className="rounded-full border border-boutique-line bg-white px-5 py-2 text-xs font-semibold text-boutique-ink transition hover:border-boutique-accent/40"
          >
            Покажи още ({visibleImages.length} от {images.length})
          </button>
        </div>
      ) : null}
    </div>
  );
}
