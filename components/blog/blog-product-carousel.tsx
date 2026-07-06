"use client";

import { useRef } from "react";

import { ProductCard } from "@/components/product/product-card";
import type { StorefrontProduct } from "@/lib/storefront/types";

type BlogProductCarouselProps = {
  products: StorefrontProduct[];
};

export function BlogProductCarousel({ products }: BlogProductCarouselProps) {
  const trackRef = useRef<HTMLDivElement>(null);

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
    <div className="mt-6">
      <div
        ref={trackRef}
        className="flex snap-x snap-mandatory gap-5 overflow-x-auto pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {products.map((product) => (
          <div
            key={product.id}
            className="min-w-[82%] snap-start sm:min-w-[48%] lg:min-w-[calc((100%_-_2.5rem)/3)]"
          >
            <ProductCard product={product} />
          </div>
        ))}
      </div>
      {products.length > 3 ? (
        <div className="mt-3 flex justify-end gap-2">
          <button
            type="button"
            onClick={() => scrollByPage(-1)}
            className="grid h-10 w-10 place-items-center rounded-full border border-boutique-line bg-white text-boutique-ink transition hover:border-boutique-sage"
            aria-label="Предишни продукти"
          >
            <span aria-hidden>←</span>
          </button>
          <button
            type="button"
            onClick={() => scrollByPage(1)}
            className="grid h-10 w-10 place-items-center rounded-full border border-boutique-line bg-white text-boutique-ink transition hover:border-boutique-sage"
            aria-label="Следващи продукти"
          >
            <span aria-hidden>→</span>
          </button>
        </div>
      ) : null}
    </div>
  );
}
