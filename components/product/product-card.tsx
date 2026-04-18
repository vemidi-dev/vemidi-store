"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

import { useCart } from "@/components/cart/cart-provider";
import type { Product } from "@/lib/catalog";
import { formatEur } from "@/lib/format-eur";

type ProductCardProps = {
  product: Product;
};

export function ProductCard({ product }: ProductCardProps) {
  const { addProduct } = useCart();
  const [added, setAdded] = useState(false);
  const cover = product.images[0];

  return (
    <article className="group flex flex-col overflow-hidden rounded-3xl border border-boutique-line/70 bg-boutique-paper shadow-[0_18px_40px_-18px_rgb(44_40_37_/0.12)] transition duration-500 ease-out hover:-translate-y-1 hover:border-boutique-accent/20 hover:shadow-[0_28px_56px_-22px_rgb(44_40_37_/0.18)]">
      <Link href={`/products/${product.slug}`} className="relative aspect-[4/5] overflow-hidden">
        <Image
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
      </Link>

      <div className="flex flex-1 flex-col p-6 sm:p-7">
        {product.tag ? (
          <p className="text-[0.65rem] font-semibold uppercase tracking-[0.22em] text-boutique-accent">
            {product.tag}
          </p>
        ) : (
          <p className="text-[0.65rem] font-semibold uppercase tracking-[0.22em] text-boutique-muted">
            В ателието
          </p>
        )}

        <Link href={`/products/${product.slug}`} className="mt-2 block focus:outline-none">
          <h2 className="font-heading text-xl leading-snug text-boutique-ink transition duration-300 group-hover:text-boutique-accent">
            {product.title}
          </h2>
        </Link>

        <p className="mt-3 line-clamp-3 flex-1 text-sm leading-relaxed text-boutique-muted">
          {product.description}
        </p>

        <div className="mt-6 border-t border-boutique-line/80 pt-5">
          <p className="font-heading text-2xl tracking-tight text-boutique-ink">
            {formatEur(product.price)}
          </p>
          <button
            type="button"
            onClick={() => {
              addProduct(product, 1);
              setAdded(true);
              setTimeout(() => setAdded(false), 1800);
            }}
            className="mt-4 w-full rounded-full bg-boutique-ink py-3.5 text-sm font-semibold tracking-wide text-boutique-paper shadow-sm transition duration-300 hover:bg-boutique-accent hover:shadow-md active:scale-[0.99]"
          >
            {added ? "Добавено в количката" : "Добави в количката"}
          </button>
          <Link
            href={`/products/${product.slug}`}
            className="mt-3 block text-center text-xs font-medium text-boutique-accent underline-offset-4 transition hover:text-boutique-ink hover:underline"
          >
            Виж детайли
          </Link>
        </div>
      </div>
    </article>
  );
}
