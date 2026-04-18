"use client";

import Image from "next/image";
import { useState } from "react";

import type { ProductImage } from "@/lib/catalog";

type ProductDetailGalleryProps = {
  images: ProductImage[];
};

export function ProductDetailGallery({ images }: ProductDetailGalleryProps) {
  const [active, setActive] = useState(0);
  const safeIndex = Math.min(active, Math.max(0, images.length - 1));
  const main = images[safeIndex] ?? images[0];

  if (!main) {
    return null;
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="relative aspect-[4/5] w-full overflow-hidden rounded-2xl border border-boutique-line/80 bg-boutique-bg shadow-boutique">
        <Image
          key={main.src}
          src={main.src}
          alt={main.alt}
          fill
          priority
          sizes="(max-width: 1024px) 100vw, 52vw"
          className="object-cover"
        />
        <div
          className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-boutique-ink/5"
          aria-hidden
        />
      </div>

      {images.length > 1 ? (
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
                <Image src={img.src} alt="" fill sizes="96px" className="object-cover" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
