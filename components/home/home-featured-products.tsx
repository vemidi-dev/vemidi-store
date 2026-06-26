"use client";

import { useState } from "react";

import { ProductCard } from "@/components/product/product-card";
import type { Product } from "@/lib/catalog";

const INITIAL_VISIBLE_PRODUCTS = 8;
const LOAD_MORE_COUNT = 8;

type HomeFeaturedProductsProps = {
  products: Product[];
};

export function HomeFeaturedProducts({ products }: HomeFeaturedProductsProps) {
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE_PRODUCTS);
  const visibleProducts = products.slice(0, visibleCount);
  const remainingCount = Math.max(0, products.length - visibleCount);

  return (
    <>
      <div className="mt-9 grid grid-cols-2 gap-3 sm:gap-6 lg:mt-12 lg:grid-cols-4 lg:gap-7">
        {visibleProducts.map((product) => (
          <ProductCard key={product.id} product={product} variant="catalog" />
        ))}
      </div>

      {remainingCount > 0 ? (
        <div className="mt-8 flex justify-center">
          <button
            type="button"
            onClick={() =>
              setVisibleCount((current) =>
                Math.min(current + LOAD_MORE_COUNT, products.length),
              )
            }
            className="inline-flex min-h-12 items-center justify-center rounded-xl border border-boutique-sage/40 bg-white px-6 py-3 text-sm font-semibold text-boutique-sage-deep shadow-boutique-sm transition hover:-translate-y-0.5 hover:border-boutique-sage-deep hover:bg-boutique-paper hover:text-boutique-ink"
          >
            Покажете още {Math.min(remainingCount, LOAD_MORE_COUNT)}
          </button>
        </div>
      ) : null}
    </>
  );
}
