import type { Metadata } from "next";
import Link from "next/link";

import { ContentImage } from "@/components/content/content-image";
import { NewsletterForm } from "@/components/content/newsletter-form";
import { PageContainer } from "@/components/layout/page-container";
import { VisualPageHero } from "@/components/layout/visual-page-hero";
import { MediaPlaceholder } from "@/components/ui/media-placeholder";
import type { BlogPostRow } from "@/lib/admin/types";
import { getCategoryListingHref } from "@/lib/category-url";
import { getPublishedBlogPosts } from "@/lib/content/repository";
import {
  getSiteMediaMap,
  resolveSiteMediaFromMap,
} from "@/lib/content/site-media";
import { buildBlogMetadata } from "@/lib/seo/blog-route";
import { getStorefrontCatalog } from "@/lib/storefront/repository";
import type { StorefrontCategory } from "@/lib/storefront/types";

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  return buildBlogMetadata(await searchParams);
}

const first = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] ?? "" : value ?? "";

function formatDate(value: string | null) {
  if (!value) return "";
  return new Intl.DateTimeFormat("bg-BG", { dateStyle: "medium" }).format(
    new Date(value),
  );
}

function getArticleHref(post: BlogPostRow) {
  return `/blog/${post.slug}`;
}

function sortOccasionsByMenuOrder(
  left: StorefrontCategory,
  right: StorefrontCategory,
) {
  return (
    left.home_sort_order - right.home_sort_order ||
    left.name.localeCompare(right.name, "bg")
  );
}

function OccasionQuickLink({ category }: { category: StorefrontCategory }) {
  return (
    <Link
      href={getCategoryListingHref(category)}
      className="rounded-full border border-boutique-line bg-white px-4 py-2 text-sm font-semibold text-boutique-ink transition hover:border-boutique-sage-deep hover:text-boutique-sage-deep"
    >
      {category.name}
    </Link>
  );
}

function TopicCard({
  category,
  post,
}: {
  category: string;
  post?: BlogPostRow;
}) {
  return (
    <Link
      href={`/blog?category=${encodeURIComponent(category)}#all-articles`}
      className="group overflow-hidden rounded-2xl border border-boutique-line bg-white shadow-boutique-sm transition hover:-translate-y-1 hover:shadow-boutique"
    >
      <div className="aspect-[4/3] overflow-hidden">
        <ContentImage
          src={post?.image_url ?? null}
          alt={category}
          label={`Снимка за тема „${category}“`}
        />
      </div>
      <div className="relative p-5 pt-7">
        <span className="absolute -top-7 left-5 grid h-14 w-14 place-items-center rounded-full border border-boutique-rose/30 bg-white font-heading text-xl text-boutique-rose-deep">
          ♡
        </span>
        <h2 className="font-heading text-2xl text-boutique-ink">{category}</h2>
        <p className="mt-2 text-sm leading-6 text-boutique-muted">
          Разгледайте идеи, вдъхновение и полезни насоки по тази тема.
        </p>
      </div>
    </Link>
  );
}

function LeadArticleCard({
  post,
  ctaHref,
  ctaLabel,
}: {
  post: BlogPostRow;
  ctaHref: string | null;
  ctaLabel: string | null;
}) {
  return (
    <article className="grid overflow-hidden rounded-2xl border border-boutique-line bg-white shadow-boutique-sm lg:grid-cols-[1.05fr_0.95fr]">
      <Link href={getArticleHref(post)} className="block min-h-72">
        <ContentImage
          src={post.image_url}
          alt={post.title}
          label="Снимка за водещата статия"
        />
      </Link>
      <div className="flex flex-col justify-center p-6 sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-boutique-rose-deep">
          {post.category ?? "Блог"}
        </p>
        <h2 className="mt-3 font-heading text-3xl leading-tight text-boutique-ink sm:text-4xl">
          <Link href={getArticleHref(post)}>{post.title}</Link>
        </h2>
        <p className="mt-4 line-clamp-4 text-sm leading-7 text-boutique-muted">
          {post.excerpt}
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href={getArticleHref(post)}
            className="rounded-full bg-boutique-ink px-5 py-2.5 text-sm font-semibold text-boutique-paper transition hover:bg-boutique-accent"
          >
            Прочетете статията →
          </Link>
          {ctaHref && ctaLabel ? (
            <Link
              href={ctaHref}
              className="rounded-full border border-boutique-line bg-white px-5 py-2.5 text-sm font-semibold text-boutique-sage-deep transition hover:border-boutique-sage-deep"
            >
              {ctaLabel} →
            </Link>
          ) : post.cta_link_label?.trim() ? (
            <span className="inline-flex items-center rounded-full border border-boutique-line bg-boutique-paper px-5 py-2.5 text-sm font-semibold text-boutique-sage-deep">
              {post.cta_link_label.trim()}
            </span>
          ) : null}
        </div>
      </div>
    </article>
  );
}

function FeaturedArticleCard({
  post,
  ctaHref,
  ctaLabel,
}: {
  post: BlogPostRow;
  ctaHref: string | null;
  ctaLabel: string | null;
}) {
  return (
    <article className="overflow-hidden rounded-2xl border border-boutique-line bg-white shadow-boutique-sm">
      <Link href={getArticleHref(post)} className="block aspect-[16/10]">
        <ContentImage
          src={post.image_url}
          alt={post.title}
          label="Снимка за статията"
        />
      </Link>
      <div className="p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-boutique-rose-deep">
          {post.category ?? "Блог"}
        </p>
        <h3 className="mt-3 font-heading text-2xl leading-tight text-boutique-ink">
          <Link href={getArticleHref(post)}>{post.title}</Link>
        </h3>
        <p className="mt-3 line-clamp-3 text-sm leading-6 text-boutique-muted">
          {post.excerpt}
        </p>
        <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-sm font-semibold">
          <Link href={getArticleHref(post)} className="text-boutique-rose-deep">
            Прочетете статията →
          </Link>
          {ctaHref && ctaLabel ? (
            <Link href={ctaHref} className="text-boutique-sage-deep">
              {ctaLabel} →
            </Link>
          ) : post.cta_link_label?.trim() ? (
            <span className="text-boutique-sage-deep">{post.cta_link_label.trim()}</span>
          ) : null}
        </div>
      </div>
    </article>
  );
}

export default async function BlogPage({ searchParams }: Props) {
  const params = await searchParams;
  const query = first(params.q).trim().toLocaleLowerCase("bg");
  const category = first(params.category);
  const sort = first(params.sort) || "newest";
  const [posts, catalog, siteMediaMap] = await Promise.all([
    getPublishedBlogPosts(),
    getStorefrontCatalog(),
    getSiteMediaMap(),
  ]);
  const heroImage = resolveSiteMediaFromMap(siteMediaMap, "blog.hero");
  const categories = [
    ...new Set(posts.map((post) => post.category).filter(Boolean)),
  ] as string[];
  const occasionQuickLinks = catalog.categories
    .filter(
      (catalogCategory) =>
        catalogCategory.category_type === "occasion" &&
        catalogCategory.is_visible !== false,
    )
    .sort(sortOccasionsByMenuOrder)
    .slice(0, 8);
  const categoryById = new Map(
    catalog.categories.map((catalogCategory) => [
      catalogCategory.id,
      catalogCategory,
    ]),
  );
  const getCtaHref = (post: BlogPostRow) => {
    const ctaCategory = post.cta_category_id
      ? categoryById.get(post.cta_category_id)
      : null;
    return ctaCategory ? getCategoryListingHref(ctaCategory) : null;
  };
  const getCtaLabel = (post: BlogPostRow) => {
    const label = post.cta_link_label?.trim();
    if (label) return label;
    const ctaCategory = post.cta_category_id
      ? categoryById.get(post.cta_category_id)
      : null;
    return ctaCategory?.name ?? null;
  };
  const filtered = posts
    .filter((post) => {
      const searchable = `${post.title} ${post.excerpt} ${post.content}`.toLocaleLowerCase(
        "bg",
      );
      return (!query || searchable.includes(query)) && (!category || post.category === category);
    })
    .sort((a, b) => {
      if (sort === "popular") {
        return Number(b.is_popular) - Number(a.is_popular);
      }
      return (
        new Date(b.published_at ?? b.created_at).getTime() -
        new Date(a.published_at ?? a.created_at).getTime()
      );
    });
  const leadPost = posts.find((post) => post.is_featured) ?? posts[0] ?? null;
  const latestPosts = posts
    .filter((post) => post.id !== leadPost?.id)
    .slice(0, 3);
  const popularPosts = posts.filter((post) => post.is_popular).slice(0, 4);
  const topicCategories = categories.slice(0, 6);

  return (
    <div>
      <VisualPageHero
        eyebrow="Идеи и вдъхновение"
        title="Блог"
        description="Идеи, вдъхновение и полезни съвети за специални поводи, детско творчество и персонализирани подаръци."
        descriptionAs="h2"
        imageSrc={heroImage.src}
        imageAlt={heroImage.alt}
      />

      {occasionQuickLinks.length || popularPosts.length ? (
        <section className="border-b border-boutique-line bg-boutique-paper/70 py-10">
          <PageContainer>
            <div className="grid gap-8 lg:grid-cols-[1fr_22rem] lg:items-start">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-boutique-sage-deep">
                  Актуално сега
                </p>
                <h2 className="mt-2 font-heading text-3xl text-boutique-ink">
                  Изберете повод и разгледайте идеи
                </h2>
                <div className="mt-5 flex flex-wrap gap-2">
                  {occasionQuickLinks.map((catalogCategory) => (
                    <OccasionQuickLink
                      key={catalogCategory.id}
                      category={catalogCategory}
                    />
                  ))}
                </div>
              </div>
              {popularPosts.length ? (
                <div className="rounded-2xl border border-boutique-line bg-white p-5">
                  <h2 className="font-heading text-2xl text-boutique-ink">
                    Популярни теми
                  </h2>
                  <div className="mt-3 grid gap-2">
                    {popularPosts.map((post) => (
                      <Link
                        key={post.id}
                        href={getArticleHref(post)}
                        className="rounded-xl border border-boutique-line/70 px-4 py-3 text-sm font-semibold text-boutique-ink transition hover:border-boutique-sage-deep hover:text-boutique-sage-deep"
                      >
                        {post.title}
                      </Link>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          </PageContainer>
        </section>
      ) : null}

      {leadPost ? (
        <section className="py-12">
          <PageContainer>
            <div className="mb-6 flex items-end justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-boutique-rose-deep">
                  Водеща статия
                </p>
                <h2 className="mt-2 font-heading text-4xl text-boutique-ink">
                  Най-полезно за момента
                </h2>
              </div>
              <Link
                href="#all-articles"
                className="hidden text-sm font-semibold text-boutique-rose-deep underline-offset-4 hover:underline sm:inline"
              >
                Вижте всички статии →
              </Link>
            </div>
            <LeadArticleCard
              post={leadPost}
              ctaHref={getCtaHref(leadPost)}
              ctaLabel={getCtaLabel(leadPost)}
            />
          </PageContainer>
        </section>
      ) : null}

      {topicCategories.length ? (
        <section className="border-y border-boutique-line bg-boutique-paper py-12">
          <PageContainer>
            <div className="flex items-end justify-between gap-4">
              <h2 className="font-heading text-4xl text-boutique-ink">
                Разгледайте по тема
              </h2>
              <Link
                href="#all-articles"
                className="text-sm font-semibold text-boutique-rose-deep underline-offset-4 hover:underline"
              >
                Всички статии →
              </Link>
            </div>
            <div className="mt-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {topicCategories.map((topic) => (
                <TopicCard
                  key={topic}
                  category={topic}
                  post={posts.find((post) => post.category === topic)}
                />
              ))}
            </div>
          </PageContainer>
        </section>
      ) : null}

      {latestPosts.length ? (
        <section className="py-12">
          <PageContainer>
            <div className="flex items-end justify-between gap-4">
              <h2 className="font-heading text-4xl text-boutique-ink">Последни статии</h2>
              <Link
                href="#all-articles"
                className="text-sm font-semibold text-boutique-rose-deep underline-offset-4 hover:underline"
              >
                Вижте всички статии →
              </Link>
            </div>
            <div className="mt-8 grid gap-6 lg:grid-cols-3">
              {latestPosts.map((post) => (
                <FeaturedArticleCard
                  key={post.id}
                  post={post}
                  ctaHref={getCtaHref(post)}
                  ctaLabel={getCtaLabel(post)}
                />
              ))}
            </div>
          </PageContainer>
        </section>
      ) : null}

      <section id="all-articles" className="scroll-mt-24 py-14">
        <PageContainer>
          <div className="grid gap-10 lg:grid-cols-[1fr_18rem]">
            <div>
              <h2 className="font-heading text-4xl text-boutique-ink">Разгледайте по тема</h2>
              <div className="mt-5 flex flex-wrap gap-2">
                <Link
                  href="/blog#all-articles"
                  className={`rounded-full border px-5 py-2 text-sm transition ${
                    !category
                      ? "border-boutique-sage-deep bg-boutique-sage-deep text-white"
                      : "border-boutique-line bg-white text-boutique-ink"
                  }`}
                >
                  Всички
                </Link>
                {categories.map((topic) => (
                  <Link
                    key={topic}
                    href={`/blog?category=${encodeURIComponent(topic)}#all-articles`}
                    className={`rounded-full border px-5 py-2 text-sm transition ${
                      category === topic
                        ? "border-boutique-sage-deep bg-boutique-sage-deep text-white"
                        : "border-boutique-line bg-white text-boutique-ink hover:border-boutique-sage/50"
                    }`}
                  >
                    {topic}
                  </Link>
                ))}
              </div>

              <form className="mt-8 grid gap-3 rounded-2xl border border-boutique-line bg-boutique-paper p-4 sm:grid-cols-[1fr_11rem_auto]">
                <input type="hidden" name="category" value={category} />
                <input
                  name="q"
                  defaultValue={first(params.q)}
                  placeholder="Търсене в статиите..."
                  className="rounded-lg border border-boutique-line bg-white px-4 py-3 text-sm outline-none focus:border-boutique-sage"
                />
                <select
                  name="sort"
                  defaultValue={sort}
                  className="rounded-lg border border-boutique-line bg-white px-4 py-3 text-sm"
                >
                  <option value="newest">Най-нови</option>
                  <option value="popular">Популярни</option>
                </select>
                <button className="rounded-lg bg-boutique-ink px-6 py-3 text-sm font-semibold text-white">
                  Показване
                </button>
              </form>

              <div className="mt-9 flex items-center justify-between gap-4">
                <h2 className="font-heading text-3xl text-boutique-ink">Всички статии</h2>
                <p className="text-sm text-boutique-muted">{filtered.length} публикации</p>
              </div>

              {filtered.length ? (
                <div className="mt-6 divide-y divide-boutique-line">
                  {filtered.map((post) => (
                    <article
                      key={post.id}
                      className="grid gap-5 py-6 first:pt-0 sm:grid-cols-[13rem_1fr]"
                    >
                      <Link
                        href={getArticleHref(post)}
                        className="block aspect-[4/3] overflow-hidden rounded-xl"
                      >
                        <ContentImage
                          src={post.image_url}
                          alt={post.title}
                          label="Снимка за статията"
                        />
                      </Link>
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.1em] text-boutique-rose-deep">
                          {post.category ?? "Блог"}
                          {post.published_at ? ` · ${formatDate(post.published_at)}` : ""}
                        </p>
                        <h3 className="mt-2 font-heading text-2xl leading-tight text-boutique-ink">
                          <Link href={getArticleHref(post)}>{post.title}</Link>
                        </h3>
                        <p className="mt-2 line-clamp-2 text-sm leading-6 text-boutique-muted">
                          {post.excerpt}
                        </p>
                        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm font-semibold">
                          <Link
                            href={getArticleHref(post)}
                            className="text-boutique-rose-deep"
                          >
                            Прочетете статията →
                          </Link>
                          {getCtaHref(post) && getCtaLabel(post) ? (
                            <Link
                              href={getCtaHref(post) ?? "/produkti"}
                              className="text-boutique-sage-deep"
                            >
                              {getCtaLabel(post)} →
                            </Link>
                          ) : post.cta_link_label?.trim() ? (
                            <span className="text-boutique-sage-deep">
                              {post.cta_link_label.trim()}
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <p className="mt-8 rounded-2xl border border-dashed border-boutique-line p-10 text-center text-boutique-muted">
                  Няма публикации по тези критерии.
                </p>
              )}
            </div>

            <aside className="space-y-6">
              <section className="overflow-hidden rounded-2xl border border-boutique-line bg-boutique-paper">
                <div className="p-6">
                  <span className="font-heading text-3xl text-boutique-rose-deep">◇</span>
                  <h2 className="mt-3 font-heading text-2xl text-boutique-ink">
                    Търсите подарък?
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-boutique-muted">
                    Разгледайте нашите персонализирани предложения за всеки повод.
                  </p>
                  <Link
                    href="/produkti"
                    className="mt-5 inline-flex rounded-lg bg-boutique-sage-deep px-5 py-2.5 text-sm font-semibold text-white"
                  >
                    Към магазина →
                  </Link>
                  {occasionQuickLinks.length ? (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {occasionQuickLinks.slice(0, 6).map((catalogCategory) => (
                        <OccasionQuickLink
                          key={catalogCategory.id}
                          category={catalogCategory}
                        />
                      ))}
                    </div>
                  ) : null}
                </div>
                <div className="aspect-[16/9]">
                  <MediaPlaceholder label="Снимка за магазина" />
                </div>
              </section>

              <NewsletterForm variant="sidebar" defaultTopic="blog" />

              <section className="rounded-2xl border border-boutique-line bg-boutique-paper p-6">
                <h2 className="font-heading text-2xl text-boutique-ink">Последвайте ни</h2>
                <p className="mt-2 text-sm leading-6 text-boutique-muted">
                  Вдъхновение, нови продукти и моменти зад кулисите.
                </p>
                <div className="mt-5 flex gap-3">
                  {["Facebook", "Instagram", "Pinterest"].map((network) => (
                    <span
                      key={network}
                      className="grid h-10 w-10 place-items-center rounded-full border border-boutique-line bg-white text-xs font-semibold text-boutique-sage-deep"
                      title={network}
                    >
                      {network.slice(0, 1)}
                    </span>
                  ))}
                </div>
              </section>
            </aside>
          </div>
        </PageContainer>
      </section>
    </div>
  );
}
