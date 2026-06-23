"use client";

import Image from "next/image";
import type { TouchEvent } from "react";
import { useRef, useState } from "react";

import type { ProductImage } from "@/lib/catalog";
import { MediaPlaceholder } from "@/components/ui/media-placeholder";

type ProductDetailGalleryProps = {
  images: ProductImage[];
};

function GalleryMainImage({
  image,
  priority,
  sizes,
  className,
}: {
  image: ProductImage | undefined;
  priority?: boolean;
  sizes: string;
  className?: string;
}) {
  return (
    <div
      className={`relative aspect-[4/5] overflow-hidden rounded-2xl border border-boutique-line/80 bg-boutique-bg shadow-boutique transition-shadow duration-300 ease-out ${className ?? ""}`}
    >
      {image?.src ? (
        <Image
          key={image.src}
          src={image.src}
          alt={image.alt}
          fill
          priority={priority}
          sizes={sizes}
          className="object-cover object-center transition-opacity duration-300 ease-out motion-reduce:transition-none"
        />
      ) : (
        <MediaPlaceholder label="Основна снимка на продукта" />
      )}
      <div
        className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-boutique-ink/5"
        aria-hidden
      />
    </div>
  );
}

function GalleryThumbnailButton({
  image,
  index,
  isActive,
  onSelect,
  className,
}: {
  image: ProductImage;
  index: number;
  isActive: boolean;
  onSelect: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`relative overflow-hidden rounded-xl border-2 bg-white transition duration-300 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-boutique-sage focus-visible:ring-offset-2 motion-reduce:transition-none ${
        isActive
          ? "border-boutique-ink shadow-[0_12px_24px_-12px_rgb(44_40_37_/0.18)]"
          : "border-transparent opacity-75 ring-1 ring-boutique-line/80 hover:-translate-y-1 hover:border-boutique-sage/35 hover:opacity-100 hover:shadow-[0_10px_20px_-12px_rgb(44_40_37_/0.14)] motion-reduce:hover:translate-y-0"
      } ${className ?? ""}`}
      aria-label={`Покажи снимка ${index + 1}`}
      aria-current={isActive ? "true" : undefined}
    >
      {image.src ? (
        <Image
          src={image.src}
          alt={image.alt || `Миниатюра ${index + 1}`}
          fill
          sizes="80px"
          className="object-contain p-1 transition-transform duration-300 ease-out hover:scale-[1.05] motion-reduce:transition-none motion-reduce:hover:scale-100"
        />
      ) : (
        <MediaPlaceholder label={`Снимка ${index + 1}`} />
      )}
    </button>
  );
}

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

  const mainImageWithArrows = (
    <div
      className="relative min-w-0 flex-1"
      onTouchStart={(event) => {
        const touch = event.touches[0];
        if (touch) {
          touchStartRef.current = { x: touch.clientX, y: touch.clientY };
        }
      }}
      onTouchEnd={handleTouchEnd}
    >
      <GalleryMainImage
        image={main}
        priority={safeIndex === 0}
        sizes="(max-width: 1024px) 100vw, 42vw"
        className="w-full touch-pan-y"
      />
      {hasMultipleImages ? (
        <>
          <button
            type="button"
            onClick={showPreviousImage}
            className="absolute left-4 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/70 bg-white/90 text-2xl leading-none text-boutique-ink shadow-lg transition duration-200 ease-out hover:-translate-x-1 hover:bg-white hover:shadow-[0_14px_28px_-10px_rgb(44_40_37_/0.2)] focus:outline-none focus:ring-2 focus:ring-boutique-sage motion-reduce:transition-none motion-reduce:hover:translate-x-0"
            aria-label="Предишна снимка"
          >
            ‹
          </button>
          <button
            type="button"
            onClick={showNextImage}
            className="absolute right-4 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/70 bg-white/90 text-2xl leading-none text-boutique-ink shadow-lg transition duration-200 ease-out hover:translate-x-1 hover:bg-white hover:shadow-[0_14px_28px_-10px_rgb(44_40_37_/0.2)] focus:outline-none focus:ring-2 focus:ring-boutique-sage motion-reduce:transition-none motion-reduce:hover:translate-x-0"
            aria-label="Следваща снимка"
          >
            ›
          </button>
        </>
      ) : null}
    </div>
  );

  return (
    <div className="flex flex-col gap-4 lg:gap-5">
      <div className="hidden lg:flex lg:items-start lg:gap-4">
        {hasMultipleImages ? (
          <ul
            className="flex w-24 shrink-0 flex-col gap-3"
            aria-label="Миниатюри на продукта"
          >
            {images.map((img, i) => (
              <li key={img.src}>
                <GalleryThumbnailButton
                  image={img}
                  index={i}
                  isActive={i === safeIndex}
                  onSelect={() => setActive(i)}
                  className="aspect-square w-24"
                />
              </li>
            ))}
          </ul>
        ) : null}
        {mainImageWithArrows}
      </div>

      <div className="lg:hidden">
        {mainImageWithArrows}
        {hasMultipleImages ? (
          <ul
            className="mt-4 grid grid-cols-4 gap-3 sm:grid-cols-6"
            aria-label="Миниатюри на продукта"
          >
            {images.map((img, i) => (
              <li key={img.src}>
                <GalleryThumbnailButton
                  image={img}
                  index={i}
                  isActive={i === safeIndex}
                  onSelect={() => setActive(i)}
                  className="aspect-square w-full"
                />
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </div>
  );
}
