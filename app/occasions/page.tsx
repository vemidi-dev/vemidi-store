import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { PageContainer } from "@/components/layout/page-container";
import { VisualPageHero } from "@/components/layout/visual-page-hero";
import { MediaPlaceholder } from "@/components/ui/media-placeholder";
import { getSiteContent } from "@/lib/content/site-content";
import type { ShopCategory } from "@/lib/shop-categories";
import { toShowcaseCategory } from "@/lib/storefront/mappers";
import { getStorefrontCatalog } from "@/lib/storefront/repository";

export const metadata: Metadata = {
  title: "Подаръци по повод",
  description:
    "Открийте подходящ персонализиран подарък за кръщене, сватба, рожден ден, юбилей и други специални моменти.",
  alternates: { canonical: "/occasions" },
};

type OccasionWithCount = ShopCategory & {
  productCount: number;
};

const occasionIcons: Record<string, string> = {
  abiturient: "◇",
  bebe: "♡",
  home: "⌂",
  jubilej: "50",
  rd: "✦",
  svatba: "∞",
  "za-uchitel": "♧",
};

function getProductLabel(count: number) {
  return count === 1 ? "1 продукт" : `${count} продукта`;
}

function OccasionCard({ occasion }: { occasion: OccasionWithCount }) {
  const href = `/shop?occasion=${encodeURIComponent(occasion.slug)}#product-grid`;

  return (
    <Link
      href={href}
      className="group overflow-hidden rounded-xl border border-boutique-line bg-white shadow-boutique-sm transition duration-300 hover:-translate-y-1 hover:border-boutique-rose-deep/35 hover:shadow-boutique sm:rounded-2xl"
    >
      <div className="relative aspect-[5/4] overflow-hidden bg-boutique-paper sm:aspect-[4/3]">
        {occasion.imageSrc ? (
          <Image
            src={occasion.imageSrc}
            alt={occasion.imageAlt}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 50vw, 25vw"
            className="object-cover transition duration-500 group-hover:scale-105"
          />
        ) : (
          <MediaPlaceholder label={`Снимка за ${occasion.title}`} />
        )}
      </div>

      <div className="flex items-center gap-2 border-t border-boutique-line bg-boutique-paper/80 px-2.5 py-2 sm:min-h-24 sm:gap-4 sm:px-5 sm:py-4">
        <span className="hidden h-12 w-12 shrink-0 place-items-center rounded-full border border-boutique-rose/30 bg-white font-heading text-lg text-boutique-rose-deep sm:grid">
          {occasionIcons[occasion.slug] ?? "♡"}
        </span>
        <div>
          <h2 className="line-clamp-2 font-heading text-sm leading-snug text-boutique-ink transition group-hover:text-boutique-rose-deep sm:text-2xl sm:leading-tight">
            {occasion.title}
          </h2>
          {occasion.productCount > 0 ? (
            <p className="mt-1 text-xs text-boutique-muted">
              {getProductLabel(occasion.productCount)}
            </p>
          ) : (
            <p className="mt-1 text-xs text-boutique-muted">Разгледай идеи</p>
          )}
        </div>
      </div>
    </Link>
  );
}

export default async function OccasionsPage() {
  const [{ categories, products }, content] = await Promise.all([
    getStorefrontCatalog(),
    getSiteContent(),
  ]);
  const counts = new Map<string, number>();

  products.forEach((product) => {
    product.categorySlugs.forEach((slug) => {
      counts.set(slug, (counts.get(slug) ?? 0) + 1);
    });
  });

  const occasions = categories
    .filter((category) => category.category_type === "occasion")
    .map(
      (category): OccasionWithCount => ({
        ...toShowcaseCategory(category),
        productCount: counts.get(category.slug) ?? 0,
      }),
    );

  return (
    <div>
      <VisualPageHero
        eyebrow={content["occasions.hero_eyebrow"]}
        title={content["occasions.hero_title"]}
        description={content["occasions.hero_description"]}
        imageSrc="/assets/povodi.png"
        imageAlt="Персонализирани подаръци за специални поводи"
      />

      <section className="py-6 md:py-16">
        <PageContainer>
          {occasions.length > 0 ? (
            <div className="grid grid-cols-2 gap-2 sm:gap-6 xl:grid-cols-4">
              {occasions.map((occasion) => (
                <OccasionCard key={occasion.slug} occasion={occasion} />
              ))}
            </div>
          ) : (
            <p className="rounded-2xl border border-boutique-line bg-boutique-paper p-8 text-center text-boutique-muted">
              Все още няма добавени поводи.
            </p>
          )}
        </PageContainer>
      </section>

      <section className="border-y border-boutique-line bg-boutique-blush/35">
        <PageContainer className="flex flex-col items-center justify-between gap-6 py-10 text-center md:flex-row md:text-left">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-boutique-rose-deep">
              {content["occasions.cta_eyebrow"]}
            </p>
            <h2 className="mt-2 font-heading text-3xl text-boutique-ink">
              {content["occasions.cta_title"]}
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-boutique-muted">
              {content["occasions.cta_text"]}
            </p>
          </div>
          <Link
            href="/contact"
            className="shrink-0 rounded-lg bg-boutique-rose-deep px-6 py-3 text-sm font-semibold text-white transition hover:bg-boutique-ink"
          >
            {content["occasions.cta_button"]}
          </Link>
        </PageContainer>
      </section>
    </div>
  );
}
