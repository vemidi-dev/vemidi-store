import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ContentImage } from "@/components/content/content-image";
import { PageContainer } from "@/components/layout/page-container";
import { ProductCard } from "@/components/product/product-card";
import { JsonLd } from "@/components/seo/json-ld";
import { VisibleBreadcrumbs } from "@/components/seo/visible-breadcrumbs";
import type { BlogCategoryRow, BlogPostRow } from "@/lib/admin/types";
import { resolveBlogRecommendation } from "@/lib/blog-recommendations";
import {
  getBlogCategoryFilterHref,
  getBlogPostCategoryName,
  postsShareBlogCategory,
} from "@/lib/blog-categories";
import {
  getActiveBlogCategories,
  getBlogPostProductIds,
  getPublishedBlogPost,
  getPublishedBlogPosts,
} from "@/lib/content/repository";
import {
  BlogRichText,
  getBlogTableOfContents,
  type BlogTableOfContentsItem,
} from "@/lib/content/blog-rich-text";
import { buildArticleSchema } from "@/lib/seo/article-schema";
import {
  buildBreadcrumbListSchema,
  buildHomeBreadcrumb,
  type BreadcrumbItem,
} from "@/lib/seo/breadcrumbs";
import { OG_DEFAULTS } from "@/lib/seo/social-images";
import { getSiteUrl } from "@/lib/site-url";
import { getStorefrontCatalog } from "@/lib/storefront/repository";

type BlogPostPageProps = { params: Promise<{ slug: string }> };

export async function generateMetadata({
  params,
}: BlogPostPageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPublishedBlogPost(slug);
  if (!post) {
    notFound();
  }
  return {
    title: post.title,
    description: post.excerpt,
    alternates: { canonical: `/blog/${slug}` },
    openGraph: {
      type: "article",
      ...OG_DEFAULTS,
      title: post.title,
      description: post.excerpt,
      url: `/blog/${slug}`,
      publishedTime: post.published_at ?? undefined,
      images: post.image_url
        ? [{ url: post.image_url, alt: post.title }]
        : undefined,
    },
    twitter: {
      card: post.image_url ? "summary_large_image" : "summary",
      title: post.title,
      description: post.excerpt,
      images: post.image_url ? [post.image_url] : undefined,
    },
  };
}

function formatDate(value: string | null) {
  if (!value) return null;
  return new Intl.DateTimeFormat("bg-BG", { dateStyle: "long" }).format(
    new Date(value),
  );
}

function getPostCategoryHref(post: BlogPostRow) {
  const slug = post.blog_category?.slug ?? post.category;
  return slug ? getBlogCategoryFilterHref(slug) : "/blog#all-articles";
}

function buildVisibleBlogBreadcrumbItems(post: BlogPostRow): BreadcrumbItem[] {
  return [
    buildHomeBreadcrumb(),
    { name: "Блог", path: "/blog" },
    { name: getBlogPostCategoryName(post), path: getPostCategoryHref(post) },
  ];
}

function buildStructuredBlogBreadcrumbItems(post: BlogPostRow): BreadcrumbItem[] {
  return [
    ...buildVisibleBlogBreadcrumbItems(post),
    { name: post.title, path: `/blog/${post.slug}` },
  ];
}

function ArticleToc({
  items,
  variant = "mobile",
}: {
  items: BlogTableOfContentsItem[];
  variant?: "mobile" | "desktop";
}) {
  if (!items.length) return null;

  const links = (
    <ol className="space-y-2">
      {items.map((item) => (
        <li key={item.id}>
          <a
            href={`#${item.id}`}
            className="block rounded-md px-1 py-1 text-sm leading-5 text-boutique-muted transition hover:bg-white/70 hover:text-boutique-sage-deep"
          >
            {item.title}
          </a>
        </li>
      ))}
    </ol>
  );

  if (variant === "desktop") {
    return (
      <section className="rounded-2xl border border-boutique-line bg-boutique-paper p-5">
        <h2 className="font-heading text-lg text-boutique-ink">В тази статия</h2>
        <div className="mt-3">{links}</div>
      </section>
    );
  }

  return (
    <details className="rounded-2xl border border-boutique-line bg-boutique-paper p-5 lg:hidden">
      <summary className="cursor-pointer list-none font-heading text-lg text-boutique-ink">
        <span className="flex items-center justify-between gap-3">
          В тази статия
          <span className="text-xs font-sans text-boutique-muted">
            Покажи съдържанието ↓
          </span>
        </span>
      </summary>
      <div className="mt-4 border-t border-boutique-line pt-3">{links}</div>
    </details>
  );
}

function BlogTopicLinks({
  categories,
  currentPost,
}: {
  categories: BlogCategoryRow[];
  currentPost: BlogPostRow;
}) {
  const currentCategoryId = currentPost.blog_category_id ?? null;
  const topics = [
    ...categories.filter((category) => category.id === currentCategoryId),
    ...categories.filter((category) => category.id !== currentCategoryId),
  ].slice(0, 5);

  if (!topics.length) return null;

  return (
    <section className="rounded-2xl border border-boutique-line bg-boutique-paper p-5">
      <h2 className="font-heading text-lg text-boutique-ink">Разгледайте по тема</h2>
      <div className="mt-3 grid gap-2">
        {topics.map((category) => (
          <Link
            key={category.id}
            href={getBlogCategoryFilterHref(category.slug)}
            className="rounded-md px-1 py-1 text-sm text-boutique-muted transition hover:bg-white/70 hover:text-boutique-sage-deep"
          >
            {category.name}
          </Link>
        ))}
      </div>
    </section>
  );
}

function RelatedPostCards({
  posts,
  compact = false,
}: {
  posts: BlogPostRow[];
  compact?: boolean;
}) {
  if (!posts.length) return null;

  if (compact) {
    return (
      <section className="rounded-2xl border border-boutique-line bg-boutique-paper p-5">
        <h2 className="font-heading text-lg text-boutique-ink">Може да ви бъде интересно</h2>
        <div className="mt-4 space-y-3">
          {posts.map((post) => (
            <Link
              key={post.id}
              href={`/blog/${post.slug}`}
              className="grid grid-cols-[4.5rem_1fr] gap-3 rounded-xl transition hover:bg-white/70"
            >
              <span className="aspect-square overflow-hidden rounded-lg border border-boutique-line bg-white">
                <ContentImage
                  src={post.image_url}
                  alt={post.title}
                  label="Снимка за подобна статия"
                />
              </span>
              <span className="self-center text-sm font-semibold leading-5 text-boutique-ink">
                {post.title}
              </span>
            </Link>
          ))}
        </div>
      </section>
    );
  }

  return (
    <section className="border-t border-boutique-line pt-9">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-boutique-sage-deep">
            Още идеи
          </p>
          <h2 className="mt-2 font-heading text-2xl text-boutique-ink">
            Подобни статии
          </h2>
        </div>
        <Link
          href="/blog#all-articles"
          className="text-sm font-semibold text-boutique-sage-deep hover:underline"
        >
          Всички статии →
        </Link>
      </div>
      <div className="mt-5 grid gap-4 sm:grid-cols-3">
        {posts.map((post) => (
          <Link
            key={post.id}
            href={`/blog/${post.slug}`}
            className="overflow-hidden rounded-2xl border border-boutique-line bg-boutique-paper transition hover:-translate-y-1 hover:shadow-boutique-sm"
          >
            <div className="aspect-[16/10]">
              <ContentImage
                src={post.image_url}
                alt={post.title}
                label="Снимка за подобна статия"
              />
            </div>
            <div className="p-4">
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-boutique-sage-deep">
                {getBlogPostCategoryName(post)}
              </p>
              <h3 className="mt-2 line-clamp-2 font-heading text-lg leading-snug text-boutique-ink">
                {post.title}
              </h3>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

function ShareLinks({
  encodedUrl,
  encodedTitle,
  compact = false,
}: {
  encodedUrl: string;
  encodedTitle: string;
  compact?: boolean;
}) {
  return (
    <section
      className={
        compact
          ? "rounded-2xl border border-boutique-line bg-boutique-paper p-5"
          : "border-t border-boutique-line pt-8"
      }
    >
      <h2 className="font-heading text-lg text-boutique-ink">
        Запазете идеите за по-късно
      </h2>
      <p className="mt-2 text-sm leading-6 text-boutique-muted">
        Добавете статията в Pinterest или я изпратете като линк.
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <a
          href={`https://pinterest.com/pin/create/button/?url=${encodedUrl}&description=${encodedTitle}`}
          target="_blank"
          rel="noreferrer"
          className="rounded-full bg-boutique-ink px-4 py-2 text-sm font-semibold text-boutique-paper transition hover:bg-boutique-accent"
        >
          Запази в Pinterest
        </a>
        {!compact ? (
          <>
            <a
              href={`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`}
              target="_blank"
              rel="noreferrer"
              className="rounded-full border border-boutique-line px-4 py-2 text-sm font-semibold text-boutique-ink"
            >
              Facebook
            </a>
            <a
              href={`mailto:?subject=${encodedTitle}&body=${encodedUrl}`}
              className="rounded-full border border-boutique-line px-4 py-2 text-sm font-semibold text-boutique-ink"
            >
              Имейл
            </a>
          </>
        ) : null}
      </div>
    </section>
  );
}

export default async function BlogPostPage({ params }: BlogPostPageProps) {
  const { slug } = await params;
  const [post, posts, blogCategories, catalog] = await Promise.all([
    getPublishedBlogPost(slug),
    getPublishedBlogPosts(),
    getActiveBlogCategories(),
    getStorefrontCatalog(),
  ]);
  if (!post) notFound();

  const selectedProductIds = await getBlogPostProductIds(post.id);
  const relatedPosts = posts
    .filter((candidate) => candidate.slug !== slug)
    .sort(
      (a, b) =>
        Number(postsShareBlogCategory(b, post)) -
          Number(postsShareBlogCategory(a, post)) ||
        new Date(b.published_at ?? b.created_at).getTime() -
          new Date(a.published_at ?? a.created_at).getTime(),
    )
    .slice(0, 3);
  const currentIndex = posts.findIndex((candidate) => candidate.slug === slug);
  const newerPost = currentIndex > 0 ? posts[currentIndex - 1] : null;
  const olderPost =
    currentIndex >= 0 && currentIndex < posts.length - 1
      ? posts[currentIndex + 1]
      : null;
  const recommendation = resolveBlogRecommendation(
    post,
    catalog,
    selectedProductIds,
  );
  const recommendedProducts = recommendation?.products.slice(0, 3) ?? [];
  const articleUrl = new URL(`/blog/${slug}`, getSiteUrl()).toString();
  const encodedUrl = encodeURIComponent(articleUrl);
  const encodedTitle = encodeURIComponent(post.title);
  const date = formatDate(post.published_at);
  const siteUrl = getSiteUrl();
  const visibleBreadcrumbItems = buildVisibleBlogBreadcrumbItems(post);
  const structuredData = [
    buildArticleSchema(post, siteUrl),
    buildBreadcrumbListSchema(buildStructuredBlogBreadcrumbItems(post), siteUrl),
  ];
  const tocItems = getBlogTableOfContents(post.content);
  const categoryName = getBlogPostCategoryName(post);

  return (
    <>
      <JsonLd data={structuredData} />
      <article className="bg-boutique-bg">
        <header className="border-b border-boutique-line bg-boutique-paper">
          <PageContainer className="py-8 sm:py-10 lg:py-12">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <VisibleBreadcrumbs
                items={visibleBreadcrumbItems}
                className="max-w-full"
              />
              <Link
                href="/blog#all-articles"
                className="text-sm font-semibold text-boutique-sage-deep hover:underline"
              >
                ← Всички статии
              </Link>
            </div>

            <div className="mx-auto mt-8 max-w-4xl text-center sm:mt-10">
              <Link
                href={getPostCategoryHref(post)}
                className="text-xs font-semibold uppercase tracking-[0.24em] text-boutique-sage-deep transition hover:text-boutique-accent"
              >
                {categoryName}
              </Link>
              <h1 className="mx-auto mt-4 max-w-4xl font-heading text-3xl leading-tight text-boutique-ink sm:text-4xl lg:text-5xl">
                {post.title}
              </h1>
              <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-boutique-muted">
                {post.excerpt}
              </p>
              <div className="mt-5 flex flex-wrap justify-center gap-x-4 gap-y-2 text-sm text-boutique-muted">
                <span>{post.author ?? "VeMiDi crafts"}</span>
                {date ? <span>{date}</span> : null}
                {post.read_minutes ? (
                  <span>{post.read_minutes} минути четене</span>
                ) : null}
              </div>
            </div>

            <div className="mx-auto mt-8 aspect-[16/10] max-w-4xl overflow-hidden rounded-2xl border border-boutique-line bg-white shadow-boutique-sm sm:aspect-[16/9] sm:rounded-3xl">
              <ContentImage
                src={post.image_url}
                alt={post.title}
                label="Снимка към статията"
              />
            </div>
          </PageContainer>
        </header>

        <PageContainer className="py-8 sm:py-10 lg:py-14">
          <div className="grid gap-8 lg:grid-cols-[minmax(0,760px)_300px] lg:items-start lg:justify-center lg:gap-12">
            <div className="min-w-0 space-y-8">
              <ArticleToc items={tocItems} />

              <BlogRichText content={post.content} />

              {recommendation ? (
                <section className="border-t border-boutique-line pt-9">
                  <div className="flex items-end justify-between gap-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-boutique-sage-deep">
                        Подходящи предложения
                      </p>
                      <h2 className="mt-2 max-w-xl font-heading text-2xl text-boutique-ink">
                        Превърнете пожеланието в личен подарък
                      </h2>
                      {recommendation.category ? (
                        <p className="mt-2 max-w-xl text-sm leading-6 text-boutique-muted">
                          Изберете ръчно изработен подарък от „{recommendation.category.name}“,
                          към който да добавим лично послание.
                        </p>
                      ) : null}
                    </div>
                    {recommendation.href ? (
                      <Link
                        href={recommendation.href}
                        className="shrink-0 text-sm font-semibold text-boutique-sage-deep hover:underline"
                      >
                        {recommendation.linkLabel ??
                          recommendation.category?.name ??
                          "Всички подаръци"}{" "}
                        →
                      </Link>
                    ) : null}
                  </div>
                  {recommendedProducts.length ? (
                    <div className="mt-5 grid gap-4 sm:grid-cols-3">
                      {recommendedProducts.map((product) => (
                        <ProductCard
                          key={product.id}
                          product={product}
                          variant="related"
                        />
                      ))}
                    </div>
                  ) : null}
                </section>
              ) : null}

              <RelatedPostCards posts={relatedPosts} />

              <nav
                aria-label="Предишна и следваща статия"
                className="grid gap-3 border-t border-boutique-line pt-8 sm:grid-cols-2"
              >
                {newerPost ? (
                  <Link
                    href={`/blog/${newerPost.slug}`}
                    className="rounded-2xl border border-boutique-line bg-boutique-paper p-5 transition hover:border-boutique-sage-deep"
                  >
                    <span className="text-xs font-semibold uppercase tracking-[0.16em] text-boutique-muted">
                      Предишна статия
                    </span>
                    <span className="mt-2 block font-heading text-xl leading-snug text-boutique-ink">
                      {newerPost.title}
                    </span>
                  </Link>
                ) : null}
                {olderPost ? (
                  <Link
                    href={`/blog/${olderPost.slug}`}
                    className="rounded-2xl border border-boutique-line bg-boutique-paper p-5 transition hover:border-boutique-sage-deep sm:text-right"
                  >
                    <span className="text-xs font-semibold uppercase tracking-[0.16em] text-boutique-muted">
                      Следваща статия
                    </span>
                    <span className="mt-2 block font-heading text-xl leading-snug text-boutique-ink">
                      {olderPost.title}
                    </span>
                  </Link>
                ) : null}
              </nav>

              <ShareLinks encodedUrl={encodedUrl} encodedTitle={encodedTitle} />

              <div className="text-center">
                <Link
                  href="/blog#all-articles"
                  className="inline-flex rounded-full border border-boutique-line bg-white px-5 py-2.5 text-sm font-semibold text-boutique-ink transition hover:border-boutique-sage-deep"
                >
                  Вижте всички статии
                </Link>
              </div>
            </div>

            <aside className="hidden lg:sticky lg:top-24 lg:block lg:space-y-5">
              <ArticleToc items={tocItems} variant="desktop" />
              <BlogTopicLinks categories={blogCategories} currentPost={post} />
              <RelatedPostCards posts={relatedPosts} compact />
              {recommendation?.href ? (
                <section className="rounded-2xl border border-boutique-line bg-boutique-paper p-5">
                  <h2 className="font-heading text-lg text-boutique-ink">
                    Подарък с лично послание
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-boutique-muted">
                    Разгледайте подходящи ръчно изработени подаръци към тази тема.
                  </p>
                  <Link
                    href={recommendation.href}
                    className="mt-4 inline-flex text-sm font-semibold text-boutique-sage-deep hover:underline"
                  >
                    {recommendation.linkLabel ??
                      recommendation.category?.name ??
                      "Разгледайте подаръците"}{" "}
                    →
                  </Link>
                </section>
              ) : null}
              <ShareLinks
                encodedUrl={encodedUrl}
                encodedTitle={encodedTitle}
                compact
              />
            </aside>
          </div>
        </PageContainer>
      </article>
    </>
  );
}
