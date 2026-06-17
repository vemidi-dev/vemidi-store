"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef, useState } from "react";

import { MediaPlaceholder } from "@/components/ui/media-placeholder";
import type { ProductImage } from "@/lib/catalog";
import type { ProductPromotionSnapshot } from "@/lib/product-pricing";
import { getProductPath } from "@/lib/product-url";

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
      className={`relative overflow-hidden ${compact ? "aspect-[5/6] sm:aspect-square" : "aspect-[4/5]"}`}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <Link href={getProductPath(slug)} className="absolute inset-0">
        {cover?.src ? (
          <>
            <Image
              key={cover.src}
              src={cover.src}
              alt={cover.alt}
              fill
              sizes="(max-width: 640px) 50vw, (max-width: 768px) 50vw, 33vw"
              className="object-cover transition duration-700 ease-out group-hover:scale-[1.04]"
            />
            <div
              className={`pointer-events-none absolute inset-0 bg-gradient-to-t from-boutique-ink/35 via-transparent to-transparent transition duration-500 group-hover:opacity-80 ${
                compact ? "opacity-40 sm:opacity-60" : "opacity-60"
              }`}
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
          <span
            className={`absolute right-1.5 top-1.5 z-10 rounded-full bg-boutique-muted font-bold uppercase tracking-wide text-white shadow-sm sm:right-2 sm:top-2 ${
              compact ? "px-2 py-0.5 text-[9px]" : "px-2.5 py-1 text-[10px]"
            }`}
          >
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
            className="absolute left-0.5 top-1/2 z-10 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-lg text-boutique-ink opacity-100 shadow-sm transition hover:bg-white sm:left-2 sm:opacity-0 sm:group-hover:opacity-100"
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
            className="absolute right-0.5 top-1/2 z-10 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-lg text-boutique-ink opacity-100 shadow-sm transition hover:bg-white sm:right-2 sm:opacity-0 sm:group-hover:opacity-100"
          >
            ›
          </button>
          <div
            className={`absolute inset-x-0 z-10 ${
              compact ? "bottom-0" : "bottom-1"
            }`}
          >
            <div className="mx-auto flex w-fit max-w-full justify-start overflow-x-auto px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
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
                  className="group/dot grid h-11 w-11 shrink-0 place-items-center rounded-full transition focus-visible:outline-offset-[-3px]"
                >
                  <span
                    aria-hidden
                    className={`block rounded-full transition ${
                      compact ? "h-1" : "h-1.5"
                    } ${
                      index === safeImageIndex
                        ? compact
                          ? "w-3.5 bg-white"
                          : "w-5 bg-white"
                        : compact
                          ? "w-1 bg-white/65 group-hover/dot:bg-white"
                          : "w-1.5 bg-white/65 group-hover/dot:bg-white"
                    }`}
                  />
                </button>
              ))}
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
