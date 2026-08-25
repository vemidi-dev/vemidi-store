import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ContentImage } from "@/components/content/content-image";
import { NewsletterForm } from "@/components/content/newsletter-form";
import { BlogProductCarousel } from "@/components/blog/blog-product-carousel";
import { PageContainer } from "@/components/layout/page-container";
import { SocialLinks } from "@/components/layout/social-links";
import { JsonLd } from "@/components/seo/json-ld";
import { VisibleBreadcrumbs } from "@/components/seo/visible-breadcrumbs";
import { siteConfig } from "@/config/site";
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
import { BlogRichText } from "@/lib/content/blog-rich-text";
import { buildArticleSchema } from "@/lib/seo/article-schema";
import {
  buildBreadcrumbListSchema,
  buildHomeBreadcrumb,
  type BreadcrumbItem,
} from "@/lib/seo/breadcrumbs";
import { OG_DEFAULTS } from "@/lib/seo/social-images";
import { getSiteUrl } from "@/lib/site-url";
import { getStorefrontCatalog } from "@/lib/storefront/repository";

const DEFAULT_RECOMMENDATION_TITLE = "Идеи към тази статия";

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

function BlogSearchAndCategories({
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

  return (
    <section className="rounded-2xl border border-boutique-line bg-boutique-paper p-5">
      <form action="/blog" className="space-y-3">
        <label
          htmlFor="blog-search"
          className="font-heading text-lg text-boutique-ink"
        >
          Търсене
        </label>
        <div className="flex overflow-hidden rounded-full border border-boutique-line bg-white">
          <input
            id="blog-search"
            name="q"
            type="search"
            placeholder="Търсете в блога..."
            className="min-w-0 flex-1 bg-transparent px-4 py-2.5 text-sm text-boutique-ink outline-none placeholder:text-boutique-muted/70"
          />
          <button
            type="submit"
            className="px-4 text-sm font-semibold text-boutique-sage-deep"
          >
            Търси
          </button>
        </div>
      </form>

      {topics.length ? (
        <>
          <h2 className="mt-6 font-heading text-lg text-boutique-ink">Категории</h2>
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
        </>
      ) : null}
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
        <h2 className="font-heading text-lg text-boutique-ink">От същата категория</h2>
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
            Още от блога
          </p>
          <h2 className="mt-2 font-heading text-2xl text-boutique-ink">
            Още от тази категория
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
        Споделете статията
      </h2>
      <p className="mt-2 text-sm leading-6 text-boutique-muted">
        Покажете идеята на приятел или ни последвайте за още вдъхновение.
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <a
          href={`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`}
          target="_blank"
          rel="noreferrer"
          className="rounded-full bg-boutique-ink px-4 py-2 text-sm font-semibold text-boutique-paper transition hover:bg-boutique-accent"
        >
          Facebook
        </a>
        {siteConfig.topBar.social.instagram ? (
          <a
            href={siteConfig.topBar.social.instagram}
            target="_blank"
            rel="noreferrer"
            className="rounded-full border border-boutique-line px-4 py-2 text-sm font-semibold text-boutique-ink"
          >
            Instagram
          </a>
        ) : null}
        {!compact ? (
          <>
            <a
              href={`mailto:?subject=${encodedTitle}&body=${encodedUrl}`}
              className="rounded-full border border-boutique-line px-4 py-2 text-sm font-semibold text-boutique-ink"
            >
              Имейл
            </a>
            {siteConfig.topBar.social.pinterest ? (
              <a
                href={`https://pinterest.com/pin/create/button/?url=${encodedUrl}&description=${encodedTitle}`}
                target="_blank"
                rel="noreferrer"
                className="rounded-full border border-boutique-line px-4 py-2 text-sm font-semibold text-boutique-ink"
              >
                Pinterest
              </a>
            ) : null}
          </>
        ) : null}
      </div>
    </section>
  );
}

function FollowUsBlock() {
  return (
    <section className="rounded-2xl border border-boutique-line bg-boutique-paper p-5">
      <h2 className="font-heading text-lg text-boutique-ink">Последвайте ни</h2>
      <p className="mt-2 text-sm leading-6 text-boutique-muted">
        Вдъхновение, нови продукти и моменти зад кулисите.
      </p>
      <div className="mt-4">
        <SocialLinks
          showHeading={false}
          networks={["facebook", "instagram", "tiktok", "pinterest"]}
        />
      </div>
    </section>
  );
}

function BlogEngageBlocks() {
  return (
    <>
      <NewsletterForm variant="sidebar" defaultTopic="blog" />
      <FollowUsBlock />
    </>
  );
}

function MobileBlogTools({
  categories,
  currentPost,
  encodedUrl,
  encodedTitle,
}: {
  categories: BlogCategoryRow[];
  currentPost: BlogPostRow;
  encodedUrl: string;
  encodedTitle: string;
}) {
  return (
    <div className="space-y-5 lg:hidden">
      <BlogSearchAndCategories categories={categories} currentPost={currentPost} />
      <BlogEngageBlocks />
      <ShareLinks encodedUrl={encodedUrl} encodedTitle={encodedTitle} compact />
    </div>
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
    .filter(
      (candidate) =>
        candidate.slug !== slug && postsShareBlogCategory(candidate, post),
    )
    .sort(
      (a, b) =>
        new Date(b.published_at ?? b.created_at).getTime() -
        new Date(a.published_at ?? a.created_at).getTime(),
    )
    .slice(0, 3);
  const recommendation = resolveBlogRecommendation(
    post,
    catalog,
    selectedProductIds,
  );
  const recommendedProducts = recommendation?.products ?? [];
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
  const categoryName = getBlogPostCategoryName(post);
  const recommendationTitle =
    post.recommendation_title?.trim() || DEFAULT_RECOMMENDATION_TITLE;
  const recommendationDescription =
    post.recommendation_description?.trim() || null;

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
              <BlogRichText content={post.content} />

              <MobileBlogTools
                categories={blogCategories}
                currentPost={post}
                encodedUrl={encodedUrl}
                encodedTitle={encodedTitle}
              />

              {recommendation ? (
                <section className="border-t border-boutique-line pt-9">
                  <div className="flex items-end justify-between gap-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-boutique-sage-deep">
                        Подходящи предложения
                      </p>
                      <h2 className="mt-2 max-w-xl font-heading text-2xl text-boutique-ink">
                        {recommendationTitle}
                      </h2>
                      {recommendationDescription ? (
                        <p className="mt-2 max-w-xl text-sm leading-6 text-boutique-muted">
                          {recommendationDescription}
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
                    <BlogProductCarousel
                      products={recommendedProducts}
                      cardVariant="related"
                    />
                  ) : null}
                </section>
              ) : null}

              <RelatedPostCards posts={relatedPosts} />

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
              <BlogSearchAndCategories categories={blogCategories} currentPost={post} />
              <BlogEngageBlocks />
              <RelatedPostCards posts={relatedPosts} compact />
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
