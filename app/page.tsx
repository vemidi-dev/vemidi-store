import Link from "next/link";

import CategoryShowcaseCard from "@/components/category/category-showcase-card";
import { HomeHero } from "@/components/home/home-hero";
import { HomeContentGrid } from "@/components/home/home-content-sections";
import { HomeAtelier, HomeBenefits, HomeProcess } from "@/components/home/home-story";
import { PageContainer } from "@/components/layout/page-container";
import { getPublishedBlogPosts, getPublishedEvents } from "@/lib/content/repository";
import { toShowcaseCategory } from "@/lib/storefront/mappers";
import { getStorefrontCatalog } from "@/lib/storefront/repository";

export default async function HomePage() {
  const [{ categories }, blogPosts, events] = await Promise.all([
    getStorefrontCatalog(),
    getPublishedBlogPosts(),
    getPublishedEvents(),
  ]);
  const occasionCategories = categories.filter(
    (category) => category.category_type === "occasion",
  );
  const productCategories = categories.filter(
    (category) => category.category_type === "product",
  );
  const featuredProductCategories = productCategories.slice(0, 8).map(toShowcaseCategory);
  const featuredOccasionCategories = occasionCategories.slice(0, 6).map(toShowcaseCategory);
  const latestPosts = blogPosts.slice(0, 3);
  const now = Date.now();
  const upcomingEvents = events
    .filter((event) => !event.starts_at || new Date(event.starts_at).getTime() >= now)
    .slice(0, 3);

  return (
    <div>
      <HomeHero />
      <HomeBenefits />

      <section className="border-b border-boutique-line bg-white py-14 md:py-16">
        <PageContainer>
          <div className="text-center">
            <h2 className="font-heading text-3xl text-boutique-ink">
              Пазарувай по повод <span className="text-boutique-rose-deep">♡</span>
            </h2>
          </div>
          <div className="mt-9 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-[repeat(6,minmax(0,1fr))_7rem]">
            {featuredOccasionCategories.map((category) => (
              <CategoryShowcaseCard
                key={category.slug}
                category={category}
                presentation="occasion"
              />
            ))}
            <Link
              href="/occasions"
              aria-label="Виж всички поводи"
              className="group col-span-2 flex min-h-32 flex-col items-center justify-center rounded-xl border border-boutique-sage/30 bg-boutique-warm/55 px-4 text-center transition hover:-translate-y-1 hover:border-boutique-sage-deep/45 hover:bg-boutique-warm sm:col-span-1"
            >
              <span className="grid h-14 w-14 place-items-center rounded-full bg-boutique-sage-deep text-2xl text-boutique-on-sage shadow-boutique-sm transition group-hover:bg-boutique-accent">
                <span aria-hidden>→</span>
              </span>
              <span className="mt-4 text-xs font-semibold leading-snug text-boutique-ink">
                Виж всички поводи
              </span>
            </Link>
          </div>
          {featuredOccasionCategories.length === 0 ? (
            <p className="mt-10 text-center text-sm text-boutique-muted">
              Категориите за поводи ще се покажат тук след добавянето им.
            </p>
          ) : null}
        </PageContainer>
      </section>

      <section className="border-b border-boutique-line bg-boutique-paper py-14 md:py-16">
        <PageContainer>
          <div className="text-center">
            <h2 className="font-heading text-3xl text-boutique-ink">
              Пазарувай по вид продукт <span className="text-boutique-rose-deep">♡</span>
            </h2>
          </div>
          <div className="mt-10 grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-4 lg:grid-cols-8">
            {featuredProductCategories.map((category) => (
              <CategoryShowcaseCard
                key={category.slug}
                category={category}
                presentation="product"
              />
            ))}
          </div>
          {featuredProductCategories.length === 0 ? (
            <p className="mt-10 text-center text-sm text-boutique-muted">
              Категориите за продукти ще се покажат тук след добавянето им.
            </p>
          ) : null}
          <div className="mt-10 text-center">
            <Link
              href="/categories"
              className="inline-flex rounded-lg bg-boutique-rose-deep px-6 py-3 text-sm font-semibold text-white transition hover:bg-boutique-ink"
            >
              Виж всички продукти
            </Link>
          </div>
        </PageContainer>
      </section>

      <HomeProcess />
      <HomeAtelier />
      <HomeContentGrid posts={latestPosts} events={upcomingEvents} />
    </div>
  );
}
