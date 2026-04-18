import Image from "next/image";
import Link from "next/link";

import type { ShopCategory } from "@/lib/shop-categories";

type CategoryShowcaseCardProps = {
  category: ShopCategory;
  /** По-малки карти за страницата с всички категории */
  compact?: boolean;
};

export default function CategoryShowcaseCard({ category, compact = false }: CategoryShowcaseCardProps) {
  const href = `/products?category=${encodeURIComponent(category.slug)}`;

  const frame = compact
    ? "rounded-xl hover:-translate-y-0.5"
    : "rounded-2xl hover:-translate-y-1.5";
  const aspect = compact ? "aspect-[4/3]" : "aspect-[3/4]";
  const padding = compact ? "p-3 sm:p-4" : "p-5 sm:p-6";
  const title = compact
    ? "text-base leading-snug sm:text-lg"
    : "text-xl leading-snug sm:text-2xl";
  const hint = compact ? "mt-1 max-w-[12rem] text-[0.65rem]" : "mt-2 max-w-[14rem] text-xs";
  const sizes = compact
    ? "(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 14vw"
    : "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 20vw";

  return (
    <Link
      href={href}
      className={`group relative block overflow-hidden border border-boutique-line/90 bg-boutique-paper shadow-boutique-sm transition duration-500 ease-out hover:border-boutique-accent/25 hover:shadow-boutique focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-boutique-accent ${frame}`}
    >
      <div className={`relative overflow-hidden ${aspect}`}>
        <Image
          src={category.imageSrc}
          alt={category.imageAlt}
          fill
          sizes={sizes}
          className="object-cover transition duration-700 ease-out group-hover:scale-[1.04]"
        />
        <div
          className="pointer-events-none absolute inset-0 bg-gradient-to-t from-boutique-ink/80 via-boutique-ink/25 to-transparent opacity-90 transition-opacity duration-500 group-hover:opacity-100"
          aria-hidden
        />
        <div className={`absolute inset-x-0 bottom-0 ${padding}`}>
          <p className={`font-heading tracking-tight text-boutique-paper ${title}`}>{category.title}</p>
          <p
            className={`font-medium leading-relaxed text-boutique-paper/80 opacity-0 transition-opacity duration-300 group-hover:opacity-100 ${hint}`}
          >
            Разгледай подбрани идеи в магазина
          </p>
        </div>
      </div>
    </Link>
  );
}
