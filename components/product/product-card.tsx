"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

import { useCart } from "@/components/cart/cart-provider";
import { MediaPlaceholder } from "@/components/ui/media-placeholder";
import type { Product } from "@/lib/catalog";
import { formatEur } from "@/lib/format-eur";

type ProductCardProps = {
  product: Product;
  variant?: "default" | "catalog";
};

export function ProductCard({ product, variant = "default" }: ProductCardProps) {
  const { addProduct } = useCart();
  const [added, setAdded] = useState(false);
  const cover = product.images[0];
  const compact = variant === "catalog";

  return (
    <article className={`group flex flex-col overflow-hidden border border-boutique-line/70 bg-boutique-paper transition duration-500 ease-out hover:-translate-y-1 hover:border-boutique-sage/40 hover:shadow-boutique ${
      compact
        ? "rounded-xl shadow-boutique-sm"
        : "rounded-3xl shadow-[0_18px_40px_-18px_rgb(44_40_37_/0.12)]"
    }`}>
      <Link
        href={`/products/${product.slug}`}
        className={`relative overflow-hidden ${compact ? "aspect-square" : "aspect-[4/5]"}`}
      >
        {cover?.src ? (
          <>
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
          </>
        ) : (
          <MediaPlaceholder label="Снимка на продукта" />
        )}
      </Link>

      <div className={`flex flex-1 flex-col ${compact ? "p-4" : "p-6 sm:p-7"}`}>
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
          <h2 className={`font-heading leading-snug text-boutique-ink transition duration-300 group-hover:text-boutique-sage-deep ${
            compact ? "text-base" : "text-xl"
          }`}>
            {product.title}
          </h2>
        </Link>

        {!compact ? (
          <p className="mt-3 line-clamp-3 flex-1 text-sm leading-relaxed text-boutique-muted">
            {product.description}
          </p>
        ) : null}

        <div className={compact ? "mt-4" : "mt-6 border-t border-boutique-line/80 pt-5"}>
          <p className={`font-heading tracking-tight text-boutique-sage-deep ${
            compact ? "text-lg" : "text-2xl"
          }`}>
            {formatEur(product.price)}
          </p>
          {compact ? (
            <Link
              href={`/products/${product.slug}`}
              className="mt-3 inline-flex text-xs font-semibold text-boutique-sage-deep underline-offset-4 hover:underline"
            >
              {product.customizable ? "Персонализирай →" : "Виж продукта →"}
            </Link>
          ) : product.customizable ? (
            <Link
              href={`/products/${product.slug}`}
              className="mt-4 block w-full rounded-full bg-boutique-ink py-3.5 text-center text-sm font-semibold tracking-wide text-boutique-paper shadow-sm transition duration-300 hover:bg-boutique-accent hover:shadow-md"
            >
              Избери персонализация
            </Link>
          ) : (
            <button
              type="button"
              aria-live="polite"
              onClick={() => {
                addProduct(product, 1);
                setAdded(true);
                setTimeout(() => setAdded(false), 1800);
              }}
              className="mt-4 w-full rounded-full bg-boutique-ink py-3.5 text-sm font-semibold tracking-wide text-boutique-paper shadow-sm transition duration-300 hover:bg-boutique-accent hover:shadow-md active:scale-[0.99]"
            >
              {added ? "Добавено в количката" : "Добави в количката"}
            </button>
          )}
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
