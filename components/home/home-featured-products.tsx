"use client";

import { useRef, useState } from "react";

import { ProductCard } from "@/components/product/product-card";
import type { Product } from "@/lib/catalog";

import { HOME_PRODUCT_PAGE_SIZE, type HomeProductPage } from "@/lib/home/products";

type HomeFeaturedProductsProps = {
  initialPage: HomeProductPage;
};

export function HomeFeaturedProducts({ initialPage }: HomeFeaturedProductsProps) {
  const [products, setProducts] = useState<Product[]>(initialPage.products);
  const [page, setPage] = useState(initialPage);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(false);
  const busy = useRef(false);
  const remainingCount = Math.max(0, page.total - page.nextOffset);

  async function loadMore() {
    if (busy.current) return;
    busy.current = true;
    setPending(true);
    setError(false);
    try {
      const response = await fetch(`/api/home-products?offset=${page.nextOffset}`, { cache: "no-store" });
      if (!response.ok) throw new Error("Products unavailable");
      const next = await response.json() as HomeProductPage;
      if (!Array.isArray(next.products) || !Number.isInteger(next.nextOffset) || (next.nextOffset <= page.nextOffset && next.total > next.nextOffset)) throw new Error("Invalid product page");
      setProducts(current => [...current, ...next.products.filter(product => !current.some(item => item.id === product.id))]);
      setPage(next);
    } catch { setError(true); }
    finally { busy.current = false; setPending(false); }
  }

  return (
    <>
      <div aria-busy={pending} className="mt-9 grid grid-cols-2 gap-3 sm:gap-6 lg:mt-12 lg:grid-cols-4 lg:gap-7">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} variant="catalog" />
        ))}
      </div>

      {remainingCount > 0 ? (
        <div className="mt-8 flex justify-center">
          <button
            type="button"
            onClick={loadMore}
            disabled={pending}
            className="inline-flex min-h-12 items-center justify-center rounded-xl border border-boutique-sage/40 bg-white px-6 py-3 text-sm font-semibold text-boutique-sage-deep shadow-boutique-sm transition hover:-translate-y-0.5 hover:border-boutique-sage-deep hover:bg-boutique-paper hover:text-boutique-ink disabled:opacity-60"
          >
            <span className="grid"><span aria-hidden="true" className="invisible col-start-1 row-start-1">Покажете още {Math.min(remainingCount, HOME_PRODUCT_PAGE_SIZE)}</span><span className="col-start-1 row-start-1">{pending ? "Зареждане…" : `Покажете още ${Math.min(remainingCount, HOME_PRODUCT_PAGE_SIZE)}`}</span></span>
          </button>
        </div>
      ) : null}
      {error ? <p role="alert" className="mt-3 text-center text-sm text-red-700">Продуктите не можаха да се заредят. Опитайте отново.</p> : null}
    </>
  );
}
