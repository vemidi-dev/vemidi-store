import Image from "next/image";
import Link from "next/link";

import type { ShopCategory } from "@/lib/shop-categories";
import { getCategoryListingHref } from "@/lib/category-url";
import { MediaPlaceholder } from "@/components/ui/media-placeholder";

type CategoryShowcaseCardProps = {
  category: ShopCategory;
  /** По-малки карти за страницата с всички категории */
  compact?: boolean;
  presentation?: "default" | "occasion" | "product";
};

export default function CategoryShowcaseCard({
  category,
  compact = false,
  presentation = "default",
}: CategoryShowcaseCardProps) {
  const href = getCategoryListingHref({
    slug: category.slug,
    category_type: category.categoryType,
  });

  if (presentation === "product") {
    return (
      <Link
        href={href}
        className="group block text-center focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-boutique-rose-deep"
      >
        <div className="relative mx-auto aspect-square w-full max-w-[5.5rem] overflow-hidden rounded-full border-2 border-boutique-rose/35 bg-boutique-paper p-1 transition group-hover:-translate-y-1 group-hover:border-boutique-rose-deep/50 sm:max-w-32">
          <div className="relative h-full w-full overflow-hidden rounded-full">
            {category.imageSrc ? (
              <Image
                src={category.imageSrc}
                alt={category.imageAlt}
                fill
                sizes="128px"
                className="object-cover transition duration-500 group-hover:scale-105"
              />
            ) : (
              <MediaPlaceholder label="Снимка" />
            )}
          </div>
        </div>
        <p className="mx-auto mt-2.5 line-clamp-2 max-w-[6rem] font-heading text-xs leading-snug text-boutique-ink transition group-hover:text-boutique-rose-deep sm:mt-4 sm:max-w-32 sm:text-base">
          {category.title}
        </p>
      </Link>
    );
  }

  if (presentation === "occasion") {
    return (
      <Link
        href={href}
        className="group block overflow-hidden rounded-xl border border-boutique-rose/20 bg-boutique-paper shadow-boutique-sm transition hover:-translate-y-1 hover:border-boutique-rose-deep/35 hover:shadow-boutique"
      >
        <div className="relative aspect-[4/3] overflow-hidden">
          {category.imageSrc ? (
            <Image
              src={category.imageSrc}
              alt={category.imageAlt}
              fill
              sizes="(max-width: 768px) 50vw, 16vw"
              className="object-cover transition duration-500 group-hover:scale-105"
            />
          ) : (
            <MediaPlaceholder label="Снимка за повод" />
          )}
        </div>
        <p className="line-clamp-2 border-t border-boutique-rose/15 px-2.5 py-2.5 text-center font-heading text-sm leading-snug text-boutique-ink sm:px-3 sm:py-3 sm:text-base sm:leading-tight">
          {category.title}
        </p>
      </Link>
    );
  }

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
        {category.imageSrc ? (
          <Image
            src={category.imageSrc}
            alt={category.imageAlt}
            fill
            sizes={sizes}
            className="object-cover transition duration-700 ease-out group-hover:scale-[1.04]"
          />
        ) : (
          <MediaPlaceholder label="Снимка на категорията" dark />
        )}
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
