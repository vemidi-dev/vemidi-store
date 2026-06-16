"use client";

import Image from "next/image";
import type { TouchEvent } from "react";
import { useRef, useState } from "react";

import type { ProductImage } from "@/lib/catalog";
import { MediaPlaceholder } from "@/components/ui/media-placeholder";

type ProductDetailGalleryProps = {
  images: ProductImage[];
};

export function ProductDetailGallery({ images }: ProductDetailGalleryProps) {
  const [active, setActive] = useState(0);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const safeIndex = Math.min(active, Math.max(0, images.length - 1));
  const main = images[safeIndex] ?? images[0];
  const hasMultipleImages = images.length > 1;

  const showImage = (index: number) => {
    if (!hasMultipleImages) {
      return;
    }

    setActive((index + images.length) % images.length);
  };

  const showPreviousImage = () => showImage(safeIndex - 1);
  const showNextImage = () => showImage(safeIndex + 1);

  const handleTouchEnd = (event: TouchEvent<HTMLDivElement>) => {
    if (!hasMultipleImages || !touchStartRef.current) {
      return;
    }

    const endTouch = event.changedTouches[0];
    if (!endTouch) {
      touchStartRef.current = null;
      return;
    }

    const deltaX = endTouch.clientX - touchStartRef.current.x;
    const deltaY = endTouch.clientY - touchStartRef.current.y;
    touchStartRef.current = null;

    if (Math.abs(deltaX) < 45 || Math.abs(deltaX) < Math.abs(deltaY)) {
      return;
    }

    if (deltaX > 0) {
      showPreviousImage();
    } else {
      showNextImage();
    }
  };

  return (
    <div className="flex flex-col gap-8">
      <div
        className="relative aspect-[4/5] w-full touch-pan-y overflow-hidden rounded-2xl border border-boutique-line/80 bg-boutique-bg shadow-boutique"
        onTouchStart={(event) => {
          const touch = event.touches[0];
          if (touch) {
            touchStartRef.current = { x: touch.clientX, y: touch.clientY };
          }
        }}
        onTouchEnd={handleTouchEnd}
      >
        {main?.src ? (
          <Image
            key={main.src}
            src={main.src}
            alt={main.alt}
            fill
            priority={safeIndex === 0}
            sizes="(max-width: 1024px) 100vw, 52vw"
            className="object-cover"
          />
        ) : (
          <MediaPlaceholder label="Основна снимка на продукта" />
        )}
        <div
          className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-boutique-ink/5"
          aria-hidden
        />
        {hasMultipleImages ? (
          <>
            <button
              type="button"
              onClick={showPreviousImage}
              className="absolute left-4 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/70 bg-white/90 text-2xl leading-none text-boutique-ink shadow-lg transition hover:-translate-x-0.5 hover:bg-white focus:outline-none focus:ring-2 focus:ring-boutique-sage"
              aria-label="Предишна снимка"
            >
              ‹
            </button>
            <button
              type="button"
              onClick={showNextImage}
              className="absolute right-4 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/70 bg-white/90 text-2xl leading-none text-boutique-ink shadow-lg transition hover:translate-x-0.5 hover:bg-white focus:outline-none focus:ring-2 focus:ring-boutique-sage"
              aria-label="Следваща снимка"
            >
              ›
            </button>
          </>
        ) : null}
      </div>

      {hasMultipleImages ? (
        <ul className="flex flex-wrap gap-4">
          {images.map((img, i) => (
            <li key={img.src}>
              <button
                type="button"
                onClick={() => setActive(i)}
                className={`relative h-24 w-20 overflow-hidden rounded-xl border-2 transition sm:h-28 sm:w-24 ${
                  i === safeIndex
                    ? "border-boutique-ink shadow-md"
                    : "border-transparent opacity-80 ring-1 ring-boutique-line/80 hover:opacity-100"
                }`}
                aria-label={`Покажи снимка ${i + 1}`}
                aria-current={i === safeIndex ? "true" : undefined}
              >
                {img.src ? (
                  <Image src={img.src} alt="" fill sizes="96px" className="object-cover" />
                ) : (
                  <MediaPlaceholder label={`Снимка ${i + 1}`} />
                )}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
