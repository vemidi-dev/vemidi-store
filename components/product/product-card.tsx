import Image from "next/image";
import Link from "next/link";

import type { Product } from "@/lib/catalog";

type ProductCardProps = {
  product: Product;
};

export function ProductCard({ product }: ProductCardProps) {
  return (
    <article className="group flex flex-col overflow-hidden rounded-2xl border border-boutique-line/90 bg-boutique-paper shadow-boutique transition duration-300 hover:-translate-y-0.5 hover:border-boutique-accent/25 hover:shadow-boutique-sm">
      <Link href={`/products/${product.slug}`} className="relative aspect-[4/5] overflow-hidden">
        <Image
          src={product.imageSrc}
          alt={product.imageAlt}
          fill
          sizes="(max-width: 768px) 100vw, 33vw"
          className="object-cover transition duration-500 group-hover:scale-[1.03]"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-boutique-ink/20 to-transparent opacity-0 transition group-hover:opacity-100" />
      </Link>
      <div className="flex flex-1 flex-col p-6 sm:p-7">
        {product.tag ? (
          <p className="text-[0.65rem] font-semibold uppercase tracking-[0.22em] text-boutique-accent">
            {product.tag}
          </p>
        ) : (
          <p className="text-[0.65rem] font-semibold uppercase tracking-[0.22em] text-boutique-muted">
            In studio
          </p>
        )}
        <Link href={`/products/${product.slug}`} className="mt-2 block">
          <h2 className="font-heading text-xl leading-snug text-boutique-ink transition group-hover:text-boutique-accent">
            {product.title}
          </h2>
        </Link>
        <p className="mt-3 flex-1 text-sm leading-relaxed text-boutique-muted">{product.description}</p>
        <div className="mt-6 flex items-end justify-between gap-4 border-t border-boutique-line/80 pt-5">
          <p className="font-heading text-2xl text-boutique-ink">€{product.price.toFixed(2)}</p>
          <Link
            href={`/products/${product.slug}`}
            className="shrink-0 rounded-full border border-boutique-ink bg-boutique-ink px-5 py-2 text-[0.7rem] font-semibold uppercase tracking-wider text-boutique-paper transition hover:bg-boutique-accent hover:text-boutique-paper"
          >
            View
          </Link>
        </div>
      </div>
    </article>
  );
}
