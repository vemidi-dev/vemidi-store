import Link from "next/link";
import { Suspense } from "react";

import CategoryShowcaseCard from "@/components/category/category-showcase-card";
import { HomeFeaturedProducts } from "@/components/home/home-featured-products";
import { HomeHero } from "@/components/home/home-hero";
import { resolveHomeHeroPreview } from "@/lib/home/hero-preview";
import { HomeContentGrid } from "@/components/home/home-content-sections";
import { HomeAtelier, HomeProcess } from "@/components/home/home-story";
import { PageContainer } from "@/components/layout/page-container";
import { getPublishedEvents } from "@/lib/content/repository";
import type { SiteContent } from "@/lib/content/site-content";
import { getHomeContent as getSiteContent, getHomeMediaMap as getSiteMediaMap, getHomeCategories, getHomeFeaturedPosts, getHomeFaqItems as getGlobalFaqItems, getHomeProductPage } from "@/lib/home/repository";
import {
  resolveSiteMediaFromMap,
} from "@/lib/content/site-media";
import { toShowcaseCategory } from "@/lib/storefront/mappers";
import { filterStorefrontVisibleCategories } from "@/lib/category-visibility";
import { buildHomePageMetadata } from "@/lib/seo/page-metadata";
import { CATEGORY_INDEX_PATH, OCCASION_INDEX_PATH } from "@/lib/category-url";

export async function generateMetadata() {
  const siteMediaMap = await getSiteMediaMap();
  const heroImage = resolveHomeHeroPreview(resolveSiteMediaFromMap(siteMediaMap, "home.hero"));

  return buildHomePageMetadata({ src: heroImage.src, alt: heroImage.alt });
}

async function HomeCatalogContent({ content }: { content: SiteContent }) {
  const [categories, initialPage] = await Promise.all([
    getHomeCategories().catch(() => []),
    getHomeProductPage().catch(() => ({ products: [], nextOffset: 0, total: 0 })),
  ]);
  const homeCategories = filterStorefrontVisibleCategories(categories)
    .filter((category) => category.show_on_home)
    .sort((a, b) => {
      const positionDifference = a.home_sort_order - b.home_sort_order;
      return positionDifference || a.name.localeCompare(b.name, "bg");
    });
  const occasionCategories = homeCategories.filter(
    (category) => category.category_type === "occasion",
  );
  const productCategories = homeCategories.filter(
    (category) =>
      category.category_type === "product" && category.parent_id === null,
  );
  const featuredProductCategories = productCategories.slice(0, 8).map(toShowcaseCategory);
  const featuredOccasionCategories = occasionCategories.slice(0, 6).map(toShowcaseCategory);

  return (
    <div data-home-section="catalog">
      {initialPage.products.length ? (
        <section className="border-b border-boutique-line bg-boutique-bg py-12 md:py-20">
          <PageContainer className="md:max-w-7xl">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-boutique-accent">
                  {content["home.featured_eyebrow"]}
                </p>
                <h2 className="mt-3 font-heading text-4xl tracking-tight text-boutique-ink md:text-5xl">
                  {content["home.featured_title"]}
                </h2>
                <p className="mt-4 max-w-2xl text-base leading-relaxed text-boutique-muted">
                  {content["home.featured_description"]}
                </p>
              </div>
              <Link
                href="/produkti"
                className="inline-flex w-fit items-center gap-3 rounded-xl bg-boutique-rose-deep px-6 py-3.5 text-sm font-semibold text-white shadow-boutique-sm transition hover:-translate-y-0.5 hover:bg-boutique-ink hover:shadow-boutique"
              >
                {content["home.featured_button"]} <span aria-hidden>→</span>
              </Link>
            </div>

            <HomeFeaturedProducts initialPage={initialPage} />
          </PageContainer>
        </section>
      ) : null}

      <section className="border-b border-boutique-line bg-white py-12 md:py-20">
        <PageContainer className="md:max-w-7xl">
          <div className="text-center">
            <h2 className="font-heading text-3xl tracking-tight text-boutique-ink sm:text-4xl">
              {content["home.occasions_title"]} <span className="text-boutique-rose-deep">♡</span>
            </h2>
          </div>
          <div className="mt-8 grid grid-cols-2 gap-3 sm:mt-10 sm:grid-cols-3 sm:gap-4 lg:grid-cols-[repeat(6,minmax(0,1fr))_8rem]">
            {featuredOccasionCategories.map((category) => (
              <CategoryShowcaseCard
                key={category.slug}
                category={category}
                presentation="occasion"
              />
            ))}
            <Link
              href={OCCASION_INDEX_PATH}
              aria-label="Вижте всички поводи"
              className="group col-span-2 flex min-h-20 items-center justify-center gap-3 rounded-xl border border-boutique-sage/30 bg-boutique-warm/55 px-4 text-center transition hover:-translate-y-1 hover:border-boutique-sage-deep/45 hover:bg-boutique-warm sm:col-span-1 sm:min-h-36 sm:flex-col sm:gap-0"
            >
              <span className="grid h-9 w-9 place-items-center rounded-full bg-boutique-sage-deep text-lg text-boutique-on-sage shadow-boutique-sm transition group-hover:bg-boutique-accent sm:h-14 sm:w-14 sm:text-2xl">
                <span aria-hidden>→</span>
              </span>
              <span className="text-xs font-semibold leading-snug text-boutique-ink sm:mt-4">
                Вижте всички поводи
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

      <section className="border-b border-boutique-line bg-boutique-paper py-12 md:py-20">
        <PageContainer className="md:max-w-7xl">
          <div className="text-center">
            <h2 className="font-heading text-3xl tracking-tight text-boutique-ink sm:text-4xl">
              {content["home.categories_title"]} <span className="text-boutique-rose-deep">♡</span>
            </h2>
          </div>
          <div className="mt-8 grid grid-cols-3 gap-x-4 gap-y-7 sm:mt-10 sm:grid-cols-4 sm:gap-x-5 sm:gap-y-9 lg:grid-cols-8">
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
          <div className="mt-12 text-center">
            <Link
              href={CATEGORY_INDEX_PATH}
              className="inline-flex rounded-xl bg-boutique-rose-deep px-7 py-3.5 text-sm font-semibold text-white shadow-boutique-sm transition hover:-translate-y-0.5 hover:bg-boutique-ink"
            >
              Вижте всички продукти
            </Link>
          </div>
        </PageContainer>
      </section>

    </div>
  );
}

async function HomeEditorialContent() {
  const [featuredPosts, events, globalFaqItems] = await Promise.all([
    getHomeFeaturedPosts().catch(() => []),
    getPublishedEvents(),
    getGlobalFaqItems().catch(() => []),
  ]);
  const now = Date.now();
  const eventTime = (event: (typeof events)[number]) => event.ends_at ?? event.starts_at;
  const upcomingEvents = events.filter(event => !eventTime(event) || Date.parse(eventTime(event)!) >= now)
    .sort((a, b) => Date.parse(a.starts_at ?? "9999-12-31") - Date.parse(b.starts_at ?? "9999-12-31")).slice(0, 6);
  const pastEvents = events.filter(event => eventTime(event) && Date.parse(eventTime(event)!) < now)
    .sort((a, b) => Date.parse(b.starts_at ?? "1970-01-01") - Date.parse(a.starts_at ?? "1970-01-01")).slice(0, 10);
  return <div data-home-section="editorial"><HomeContentGrid faqItems={globalFaqItems} pastEvents={pastEvents} posts={featuredPosts} upcomingEvents={upcomingEvents} /></div>;
}

function HomeSectionFallback() {
  return <section aria-busy="true" aria-label="Зареждане" className="border-b border-boutique-line bg-boutique-bg py-12 md:py-20">
    <PageContainer className="md:max-w-7xl"><div className="h-10 w-60 max-w-full rounded bg-boutique-line/50" /><div className="mt-9 grid grid-cols-2 gap-3 sm:gap-6 lg:grid-cols-4 lg:gap-7">{Array.from({ length: 8 }, (_, index) => <div key={index} className="aspect-[3/4] rounded-lg bg-boutique-line/30" />)}</div></PageContainer>
  </section>;
}

export default async function HomePage() {
  const [content, siteMediaMap] = await Promise.all([getSiteContent(), getSiteMediaMap()]);
  const heroImage = resolveHomeHeroPreview(resolveSiteMediaFromMap(siteMediaMap, "home.hero"));
  const atelierImage = resolveSiteMediaFromMap(siteMediaMap, "home.atelier");
  return <div>
    <HomeHero content={content} heroImage={heroImage} />
    <Suspense fallback={<HomeSectionFallback />}><HomeCatalogContent content={content} /></Suspense>
    <HomeProcess content={content} />
    <HomeAtelier content={content} atelierImage={atelierImage} />
    <Suspense fallback={<HomeSectionFallback />}><HomeEditorialContent /></Suspense>
  </div>;
}
