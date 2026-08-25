"use client";

import { useRef } from "react";

import { ProductCard } from "@/components/product/product-card";
import type { StorefrontProduct } from "@/lib/storefront/types";

type BlogProductCarouselProps = {
  products: StorefrontProduct[];
  cardVariant?: "default" | "catalog" | "related";
};

export function BlogProductCarousel({
  products,
  cardVariant = "default",
}: BlogProductCarouselProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const showArrows = products.length > 3;

  function scrollByPage(direction: -1 | 1) {
    const track = trackRef.current;
    if (!track) return;
    track.scrollBy({
      left: direction * track.clientWidth,
      behavior: "smooth",
    });
  }

  if (products.length === 0) {
    return null;
  }

  return (
    <div className="mt-5">
      <div
        ref={trackRef}
        className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:gap-5"
      >
        {products.map((product) => (
          <div
            key={product.id}
            className="min-w-[82%] snap-start sm:min-w-[48%] lg:min-w-[calc((100%_-_2.5rem)/3)]"
          >
            <ProductCard product={product} variant={cardVariant} />
          </div>
        ))}
      </div>
      {showArrows ? (
        <div className="mt-3 flex justify-end gap-2">
          <button
            type="button"
            onClick={() => scrollByPage(-1)}
            className="grid h-9 w-9 place-items-center rounded-full border border-boutique-line bg-white text-boutique-ink transition hover:border-boutique-sage sm:h-10 sm:w-10"
            aria-label="Предишни продукти"
          >
            <span aria-hidden>←</span>
          </button>
          <button
            type="button"
            onClick={() => scrollByPage(1)}
            className="grid h-9 w-9 place-items-center rounded-full border border-boutique-line bg-white text-boutique-ink transition hover:border-boutique-sage sm:h-10 sm:w-10"
            aria-label="Следващи продукти"
          >
            <span aria-hidden>→</span>
          </button>
        </div>
      ) : null}
    </div>
  );
}
