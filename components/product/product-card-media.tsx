"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef, useState } from "react";

import { MediaPlaceholder } from "@/components/ui/media-placeholder";
import type { ProductImage } from "@/lib/catalog";
import type { ProductPromotionSnapshot } from "@/lib/product-pricing";

const SWIPE_THRESHOLD_PX = 40;

type ProductCardMediaProps = {
  slug: string;
  images: ProductImage[];
  soldOut?: boolean;
  promotion?: ProductPromotionSnapshot | null;
  compact?: boolean;
};

export function ProductCardMedia({
  slug,
  images,
  soldOut,
  promotion,
  compact = false,
}: ProductCardMediaProps) {
  const [activeImage, setActiveImage] = useState(0);
  const touchStartX = useRef<number | null>(null);
  const hasMultiple = images.length > 1;
  const safeImageIndex = Math.min(
    activeImage,
    Math.max(0, images.length - 1),
  );
  const cover = images[safeImageIndex] ?? images[0];

  const showPrevious = () => {
    setActiveImage((current) =>
      current === 0 ? images.length - 1 : current - 1,
    );
  };

  const showNext = () => {
    setActiveImage((current) => (current + 1) % images.length);
  };

  const handleTouchStart = (event: React.TouchEvent<HTMLDivElement>) => {
    if (!hasMultiple) {
      return;
    }

    touchStartX.current = event.touches[0]?.clientX ?? null;
  };

  const handleTouchEnd = (event: React.TouchEvent<HTMLDivElement>) => {
    if (!hasMultiple || touchStartX.current === null) {
      return;
    }

    const startX = touchStartX.current;
    const endX = event.changedTouches[0]?.clientX;
    touchStartX.current = null;

    if (endX == null) {
      return;
    }

    const delta = endX - startX;
    if (Math.abs(delta) < SWIPE_THRESHOLD_PX) {
      return;
    }

    if (delta > 0) {
      showPrevious();
      return;
    }

    showNext();
  };

  const stopCarouselEvent = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
  };

  return (
    <div
      className={`relative overflow-hidden ${compact ? "aspect-square" : "aspect-[4/5]"}`}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <Link href={`/products/${slug}`} className="absolute inset-0">
        {cover?.src ? (
          <>
            <Image
              key={cover.src}
              src={cover.src}
              alt={cover.alt}
              fill
              sizes="(max-width: 768px) 100vw, 33vw"
              className="object-cover transition duration-700 ease-out group-hover:scale-[1.04]"
            />
            <div
              className="pointer-events-none absolute inset-0 bg-gradient-to-t from-boutique-ink/35 via-transparent to-transparent opacity-60 transition duration-500 group-hover:opacity-80"
              aria-hidden
            />
          </>
        ) : (
          <MediaPlaceholder label="Снимка на продукта" />
        )}
      </Link>

      {soldOut ? (
        <>
          <div
            className="pointer-events-none absolute inset-0 z-[5] bg-boutique-ink/15"
            aria-hidden
          />
          <span className="absolute right-2 top-2 z-10 rounded-full bg-boutique-muted px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-white shadow-sm">
            Изчерпан
          </span>
        </>
      ) : null}

      {!soldOut && promotion ? (
        <span className="absolute left-2 top-2 z-10 rounded-full bg-boutique-accent px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-white shadow-sm">
          {promotion.label}
        </span>
      ) : null}

      {hasMultiple ? (
        <>
          <button
            type="button"
            onClick={(event) => {
              stopCarouselEvent(event);
              showPrevious();
            }}
            aria-label="Предишна снимка"
            className="absolute left-2 top-1/2 z-10 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-lg text-boutique-ink opacity-100 shadow-sm transition hover:bg-white sm:opacity-0 sm:group-hover:opacity-100"
          >
            ‹
          </button>
          <button
            type="button"
            onClick={(event) => {
              stopCarouselEvent(event);
              showNext();
            }}
            aria-label="Следваща снимка"
            className="absolute right-2 top-1/2 z-10 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-lg text-boutique-ink opacity-100 shadow-sm transition hover:bg-white sm:opacity-0 sm:group-hover:opacity-100"
          >
            ›
          </button>
          <div className="absolute inset-x-0 bottom-3 z-10 flex justify-center gap-1.5">
            {images.map((image, index) => (
              <button
                key={`${image.src}-${index}`}
                type="button"
                onClick={(event) => {
                  stopCarouselEvent(event);
                  setActiveImage(index);
                }}
                aria-label={`Покажи снимка ${index + 1}`}
                aria-current={index === safeImageIndex ? "true" : undefined}
                className={`h-1.5 rounded-full transition ${
                  index === safeImageIndex
                    ? "w-5 bg-white"
                    : "w-1.5 bg-white/65 hover:bg-white"
                }`}
              />
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}
