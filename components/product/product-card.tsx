import Link from "next/link";

import { ProductPrice } from "@/components/product/product-price";
import { ProductCardMedia } from "@/components/product/product-card-media";
import type { Product } from "@/lib/catalog";
import {
  getProductCardCtaLabel,
  resolveProductCardStatusLabel,
} from "@/lib/product-card";

type ProductCardProps = {
  product: Product;
  variant?: "default" | "catalog";
};

export function ProductCard({ product, variant = "default" }: ProductCardProps) {
  const compact = variant === "catalog";
  const statusLabel = resolveProductCardStatusLabel(product);
  const ctaLabel = getProductCardCtaLabel(product);
  const ctaClassName = compact
    ? "mt-2 inline-flex min-h-9 items-center text-xs font-semibold text-boutique-sage-deep underline-offset-4 hover:underline sm:mt-3 sm:text-sm"
    : "mt-4 block w-full rounded-full bg-boutique-ink py-3.5 text-center text-sm font-semibold tracking-wide text-boutique-paper shadow-sm transition duration-300 hover:bg-boutique-accent hover:shadow-md";

  return (
    <article
      className={`group flex flex-col overflow-hidden border border-boutique-line/70 bg-boutique-paper transition duration-500 ease-out hover:-translate-y-1 hover:border-boutique-sage/40 hover:shadow-boutique ${
        compact
          ? "rounded-xl shadow-boutique-sm"
          : "rounded-3xl shadow-[0_18px_40px_-18px_rgb(44_40_37_/0.12)]"
      }`}
    >
      <ProductCardMedia
        slug={product.slug}
        images={product.images}
        soldOut={product.soldOut}
        promotion={product.promotion}
        compact={compact}
      />

      <div className={`flex flex-1 flex-col ${compact ? "p-3 sm:p-5" : "p-6 sm:p-7"}`}>
        {statusLabel ? (
          <p
            className={`font-semibold uppercase tracking-[0.22em] text-boutique-accent ${
              compact
                ? "hidden text-[0.6rem] tracking-[0.18em] sm:block"
                : "text-[0.65rem]"
            }`}
          >
            {statusLabel}
          </p>
        ) : null}

        <Link
          href={`/products/${product.slug}`}
          className={`block focus:outline-none ${statusLabel && !compact ? "mt-2" : compact && statusLabel ? "sm:mt-2" : ""}`}
        >
          <h2
            className={`font-heading text-boutique-ink transition duration-300 group-hover:text-boutique-sage-deep ${
              compact
                ? "line-clamp-2 text-sm leading-snug sm:text-lg"
                : "text-xl leading-snug"
            }`}
          >
            {product.title}
          </h2>
        </Link>

        {!compact ? (
          <p className="mt-3 line-clamp-3 flex-1 text-sm leading-relaxed text-boutique-muted">
            {product.description}
          </p>
        ) : null}

        <div className={compact ? "mt-3 sm:mt-5" : "mt-6 border-t border-boutique-line/80 pt-5"}>
          <ProductPrice product={product} size={compact ? "md" : "lg"} />
          {product.soldOut ? (
            <p className="mt-3 text-xs font-semibold uppercase tracking-[0.16em] text-boutique-muted">
              Изчерпан
            </p>
          ) : (
            <Link href={`/products/${product.slug}`} className={ctaClassName}>
              {compact ? `${ctaLabel} →` : ctaLabel}
            </Link>
          )}
        </div>
      </div>
    </article>
  );
}
