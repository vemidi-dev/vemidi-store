import Image from "next/image";
import Link from "next/link";

import type { ShopCategory } from "@/lib/shop-categories";

type CategoryShowcaseCardProps = {
  category: ShopCategory;
};

export default function CategoryShowcaseCard({ category }: CategoryShowcaseCardProps) {
  const href = `/products?category=${encodeURIComponent(category.slug)}`;

  return (
    <Link
      href={href}
      className="group relative block overflow-hidden rounded-2xl border border-boutique-line/90 bg-boutique-paper shadow-boutique-sm transition duration-500 ease-out hover:-translate-y-1.5 hover:border-boutique-accent/25 hover:shadow-boutique focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-boutique-accent"
    >
      <div className="relative aspect-[3/4] overflow-hidden">
        <Image
          src={category.imageSrc}
          alt={category.imageAlt}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 20vw"
          className="object-cover transition duration-700 ease-out group-hover:scale-[1.06]"
        />
        <div
          className="pointer-events-none absolute inset-0 bg-gradient-to-t from-boutique-ink/80 via-boutique-ink/25 to-transparent opacity-90 transition-opacity duration-500 group-hover:opacity-100"
          aria-hidden
        />
        <div className="absolute inset-x-0 bottom-0 p-5 sm:p-6">
          <p className="font-heading text-xl leading-snug tracking-tight text-boutique-paper sm:text-2xl">
            {category.title}
          </p>
          <p className="mt-2 max-w-[14rem] text-xs font-medium leading-relaxed text-boutique-paper/80 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
            Разгледай подбрани идеи в магазина
          </p>
        </div>
      </div>
    </Link>
  );
}
