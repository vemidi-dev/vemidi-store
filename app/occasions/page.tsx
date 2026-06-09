import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { PageContainer } from "@/components/layout/page-container";
import { MediaPlaceholder } from "@/components/ui/media-placeholder";
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
      className="group overflow-hidden rounded-2xl border border-boutique-line bg-white shadow-boutique-sm transition duration-300 hover:-translate-y-1 hover:border-boutique-rose-deep/35 hover:shadow-boutique"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-boutique-paper">
        {occasion.imageSrc ? (
          <Image
            src={occasion.imageSrc}
            alt={occasion.imageAlt}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
            className="object-cover transition duration-500 group-hover:scale-105"
          />
        ) : (
          <MediaPlaceholder label={`Снимка за ${occasion.title}`} />
        )}
      </div>

      <div className="flex min-h-24 items-center gap-4 border-t border-boutique-line bg-boutique-paper/80 px-5 py-4">
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full border border-boutique-rose/30 bg-white font-heading text-lg text-boutique-rose-deep">
          {occasionIcons[occasion.slug] ?? "♡"}
        </span>
        <div>
          <h2 className="font-heading text-2xl leading-tight text-boutique-ink transition group-hover:text-boutique-rose-deep">
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
  const { categories, products } = await getStorefrontCatalog();
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
      <section className="overflow-hidden border-b border-boutique-line bg-boutique-paper">
        <div className="grid min-h-[22rem] lg:grid-cols-[0.72fr_1.28fr]">
          <div className="flex items-center bg-[linear-gradient(135deg,#fdfcfa_0%,#ebe4db_100%)]">
            <PageContainer className="py-14 text-center lg:pl-14 lg:pr-10">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-boutique-rose-deep">
                Подаръци за специалните моменти
              </p>
              <h1 className="mt-5 font-heading text-6xl leading-none text-boutique-ink sm:text-7xl">
                По повод
              </h1>
              <p className="mx-auto mt-7 max-w-sm text-lg leading-7 text-boutique-muted">
                Открийте перфектния подарък за всеки специален момент.
              </p>
              <div className="mx-auto mt-7 flex max-w-64 items-center gap-4 text-boutique-rose-deep">
                <span className="h-px flex-1 bg-boutique-rose/50" />
                <span className="font-heading text-2xl">♡</span>
                <span className="h-px flex-1 bg-boutique-rose/50" />
              </div>
            </PageContainer>
          </div>

          <div className="min-h-72 lg:min-h-full">
            <MediaPlaceholder
              label="Банер за страницата „По повод“"
              className="min-h-72 rounded-none border-0 lg:min-h-full"
            />
          </div>
        </div>
      </section>

      <section className="py-12 md:py-16">
        <PageContainer>
          {occasions.length > 0 ? (
            <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
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
              Не намирате Вашия повод?
            </p>
            <h2 className="mt-2 font-heading text-3xl text-boutique-ink">
              Ще създадем нещо лично за Вас
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-boutique-muted">
              Разкажете ни за човека и момента, а ние ще Ви помогнем да изберете подходящ
              персонализиран подарък.
            </p>
          </div>
          <Link
            href="/contact"
            className="shrink-0 rounded-lg bg-boutique-rose-deep px-6 py-3 text-sm font-semibold text-white transition hover:bg-boutique-ink"
          >
            Свържете се с нас
          </Link>
        </PageContainer>
      </section>
    </div>
  );
}
