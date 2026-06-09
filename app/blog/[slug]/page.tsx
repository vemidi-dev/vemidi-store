import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ContentDetail } from "@/components/content/content-detail";
import { ContentImage } from "@/components/content/content-image";
import { ProductCard } from "@/components/product/product-card";
import {
  getPublishedBlogPost,
  getPublishedBlogPosts,
  getPublishedEvents,
} from "@/lib/content/repository";
import { getSiteUrl } from "@/lib/site-url";
import { getStorefrontCatalog } from "@/lib/storefront/repository";

type BlogPostPageProps = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: BlogPostPageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPublishedBlogPost(slug);
  if (!post) return { title: "Публикацията не е намерена", robots: { index: false } };
  return {
    title: post.title,
    description: post.excerpt,
    alternates: { canonical: `/blog/${slug}` },
    openGraph: {
      type: "article",
      title: post.title,
      description: post.excerpt,
      url: `/blog/${slug}`,
      publishedTime: post.published_at ?? undefined,
      images: post.image_url ? [{ url: post.image_url, alt: post.title }] : undefined,
    },
  };
}

export default async function BlogPostPage({ params }: BlogPostPageProps) {
  const { slug } = await params;
  const [post, posts, events, catalog] = await Promise.all([
    getPublishedBlogPost(slug),
    getPublishedBlogPosts(),
    getPublishedEvents(),
    getStorefrontCatalog(),
  ]);
  if (!post) notFound();
  const relatedPosts = posts
    .filter((candidate) => candidate.slug !== slug)
    .sort((a, b) => Number(b.category === post.category) - Number(a.category === post.category))
    .slice(0, 3);
  const relatedEvents = events
    .filter((event) => !event.starts_at || new Date(event.starts_at).getTime() >= Date.now())
    .slice(0, 2);
  const ctaCategory = post.cta_category_id
    ? catalog.categories.find((category) => category.id === post.cta_category_id)
    : null;
  const relatedProducts = ctaCategory
    ? catalog.products
        .filter((product) => product.categorySlugs.includes(ctaCategory.slug))
        .slice(0, 2)
    : catalog.products.slice(0, 2);
  const articleUrl = new URL(`/blog/${slug}`, getSiteUrl()).toString();
  const encodedUrl = encodeURIComponent(articleUrl);
  const encodedTitle = encodeURIComponent(post.title);
  const date = post.published_at
    ? new Intl.DateTimeFormat("bg-BG", { dateStyle: "long" }).format(new Date(post.published_at))
    : null;
  return (
    <ContentDetail
      eyebrow="Блог"
      title={post.title}
      excerpt={post.excerpt}
      content={post.content}
      imageUrl={post.image_url}
      meta={[
        post.author ?? "VeMiDi crafts",
        ...(date ? [date] : []),
        ...(post.read_minutes ? [`${post.read_minutes} мин. четене`] : []),
      ]}
    >
      {post.cta_link_label && ctaCategory ? (
        <section className="rounded-3xl border border-boutique-line bg-boutique-paper px-6 py-8 text-center">
          <p className="text-sm leading-relaxed text-boutique-muted">
            Разгледайте подбраните предложения от категория „{ctaCategory.name}“.
          </p>
          <Link
            href={`/shop?product=${encodeURIComponent(ctaCategory.slug)}#product-grid`}
            className="mt-5 inline-flex rounded-full bg-boutique-ink px-7 py-3 text-sm font-semibold text-boutique-paper transition hover:bg-boutique-accent"
          >
            {post.cta_link_label}
          </Link>
        </section>
      ) : null}

      {relatedProducts.length ? (
        <section>
          <h2 className="font-heading text-2xl text-boutique-ink">Подходящи продукти</h2>
          <div className="mt-5 grid gap-6 sm:grid-cols-2">
            {relatedProducts.map((product) => <ProductCard key={product.slug} product={product} />)}
          </div>
        </section>
      ) : null}

      {relatedEvents.length ? (
        <section>
          <h2 className="font-heading text-2xl text-boutique-ink">Свързани събития</h2>
          <div className="mt-5 grid gap-5 sm:grid-cols-2">
            {relatedEvents.map((event) => (
              <Link key={event.id} href={`/events/${event.slug}`} className="overflow-hidden rounded-2xl border border-boutique-line bg-boutique-paper">
                <div className="aspect-[16/9]">
                  <ContentImage src={event.image_url} alt={event.title} label="Снимка за събитието" />
                </div>
                <div className="p-5 font-heading text-xl text-boutique-ink">{event.title}</div>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      {relatedPosts.length ? (
        <section>
          <h2 className="font-heading text-2xl text-boutique-ink">Подобни статии</h2>
          <div className="mt-4 grid gap-3">
            {relatedPosts.map((related) => (
              <Link
                key={related.id}
                href={`/blog/${related.slug}`}
                className="rounded-2xl border border-boutique-line bg-boutique-paper px-5 py-4 font-semibold text-boutique-ink hover:border-boutique-accent"
              >
                {related.title}
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      <section>
        <h2 className="font-heading text-2xl text-boutique-ink">Сподели статията</h2>
        <div className="mt-4 flex flex-wrap gap-3">
          <a href={`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`} target="_blank" rel="noreferrer" className="rounded-full border border-boutique-line px-5 py-2 text-sm font-semibold text-boutique-ink">Facebook</a>
          <a href={`https://pinterest.com/pin/create/button/?url=${encodedUrl}&description=${encodedTitle}`} target="_blank" rel="noreferrer" className="rounded-full border border-boutique-line px-5 py-2 text-sm font-semibold text-boutique-ink">Pinterest</a>
          <a href={`mailto:?subject=${encodedTitle}&body=${encodedUrl}`} className="rounded-full border border-boutique-line px-5 py-2 text-sm font-semibold text-boutique-ink">Имейл</a>
        </div>
      </section>
    </ContentDetail>
  );
}
