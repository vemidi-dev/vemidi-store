import type { Metadata } from "next";
import Link from "next/link";

import { ContentImage } from "@/components/content/content-image";
import { NewsletterForm } from "@/components/content/newsletter-form";
import { PageContainer } from "@/components/layout/page-container";
import { VisualPageHero } from "@/components/layout/visual-page-hero";
import { MediaPlaceholder } from "@/components/ui/media-placeholder";
import type { BlogPostRow } from "@/lib/admin/types";
import { getPublishedBlogPosts } from "@/lib/content/repository";
import { getStorefrontCatalog } from "@/lib/storefront/repository";

export const metadata: Metadata = {
  title: "Блог",
  description:
    "Идеи за подаръци, детско творчество, полезни съвети и истории от ателието на VeMiDi.",
  alternates: { canonical: "/blog" },
};

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

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

function FeaturedArticleCard({
  post,
  ctaHref,
}: {
  post: BlogPostRow;
  ctaHref: string | null;
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
            Прочети статията →
          </Link>
          {ctaHref && post.cta_link_label ? (
            <Link href={ctaHref} className="text-boutique-sage-deep">
              {post.cta_link_label} →
            </Link>
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
  const [posts, catalog] = await Promise.all([
    getPublishedBlogPosts(),
    getStorefrontCatalog(),
  ]);
  const categories = [
    ...new Set(posts.map((post) => post.category).filter(Boolean)),
  ] as string[];
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
    return ctaCategory
      ? `/shop?product=${encodeURIComponent(ctaCategory.slug)}#product-grid`
      : null;
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
  const latestPosts = posts.slice(0, 3);
  const topicCategories = categories.slice(0, 4);

  return (
    <div>
      <VisualPageHero
        eyebrow="Идеи и вдъхновение"
        title="Блог"
        description="Идеи, вдъхновение и полезни съвети за специални поводи, детско творчество и персонализирани подаръци."
        imageSrc="/assets/cover-blog.png"
        imageAlt="Идеи и вдъхновение от блога на VeMiDi crafts"
      />

      {topicCategories.length ? (
        <section className="py-12">
          <PageContainer>
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
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
        <section className="border-y border-boutique-line bg-boutique-paper py-12">
          <PageContainer>
            <div className="flex items-end justify-between gap-4">
              <h2 className="font-heading text-4xl text-boutique-ink">Последни статии</h2>
              <Link
                href="#all-articles"
                className="text-sm font-semibold text-boutique-rose-deep underline-offset-4 hover:underline"
              >
                Виж всички статии →
              </Link>
            </div>
            <div className="mt-8 grid gap-6 lg:grid-cols-3">
              {latestPosts.map((post) => (
                <FeaturedArticleCard
                  key={post.id}
                  post={post}
                  ctaHref={getCtaHref(post)}
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
              <h2 className="font-heading text-4xl text-boutique-ink">Разгледай по тема</h2>
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
                  Покажи
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
                            Прочети статията →
                          </Link>
                          {getCtaHref(post) && post.cta_link_label ? (
                            <Link
                              href={getCtaHref(post) ?? "/shop"}
                              className="text-boutique-sage-deep"
                            >
                              {post.cta_link_label} →
                            </Link>
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
                    href="/shop"
                    className="mt-5 inline-flex rounded-lg bg-boutique-sage-deep px-5 py-2.5 text-sm font-semibold text-white"
                  >
                    Към магазина →
                  </Link>
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
