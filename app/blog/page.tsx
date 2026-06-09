import type { Metadata } from "next";
import Link from "next/link";

import { ContentImage } from "@/components/content/content-image";
import { NewsletterForm } from "@/components/content/newsletter-form";
import { PageContainer } from "@/components/layout/page-container";
import { PageHero } from "@/components/ui/page-hero";
import { getPublishedBlogPosts } from "@/lib/content/repository";

export const metadata: Metadata = {
  title: "Блог",
  description: "Идеи за подаръци, творчески насоки и истории от VeMiDi crafts.",
  alternates: { canonical: "/blog" },
};

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };
const first = (value: string | string[] | undefined) => Array.isArray(value) ? value[0] ?? "" : value ?? "";

export default async function BlogPage({ searchParams }: Props) {
  const params = await searchParams;
  const query = first(params.q).trim().toLocaleLowerCase("bg");
  const category = first(params.category);
  const posts = await getPublishedBlogPosts();
  const categories = [...new Set(posts.map((post) => post.category).filter(Boolean))] as string[];
  const featured = posts.find((post) => post.is_featured) ?? posts[0];
  const filtered = posts.filter((post) => {
    const matchesQuery = !query || `${post.title} ${post.excerpt} ${post.content}`.toLocaleLowerCase("bg").includes(query);
    return matchesQuery && (!category || post.category === category);
  });

  return (
    <div>
      <PageHero eyebrow="Вдъхновение" title="Блог" description="Идеи за подаръци, полезни насоки и истории от ателието." />
      <section className="border-b border-boutique-line bg-boutique-bg py-8">
        <PageContainer>
          <form className="grid gap-3 rounded-2xl border border-boutique-line bg-boutique-paper p-4 md:grid-cols-[1fr_240px_auto]">
            <input name="q" defaultValue={first(params.q)} placeholder="Търсене в статиите..." className="rounded-xl border border-boutique-line bg-boutique-bg px-4 py-3 text-sm" />
            <select name="category" defaultValue={category} className="rounded-xl border border-boutique-line bg-boutique-bg px-4 py-3 text-sm">
              <option value="">Всички теми</option>
              {categories.map((value) => <option key={value}>{value}</option>)}
            </select>
            <button className="rounded-xl bg-boutique-ink px-6 py-3 text-sm font-semibold text-boutique-paper">Филтрирай</button>
          </form>
        </PageContainer>
      </section>

      {featured && !query && !category ? (
        <section className="py-12">
          <PageContainer>
            <article className="overflow-hidden rounded-3xl border border-boutique-line bg-boutique-paper shadow-boutique lg:grid lg:grid-cols-2">
              <Link href={`/blog/${featured.slug}`} className="block aspect-[4/3] lg:aspect-auto"><ContentImage src={featured.image_url} alt={featured.title} label="Снимка за водещата статия" /></Link>
              <div className="flex flex-col justify-center p-8 lg:p-12">
                <p className="text-xs font-semibold uppercase tracking-wider text-boutique-accent">Водеща статия {featured.category ? `· ${featured.category}` : ""}</p>
                <h2 className="mt-4 font-heading text-4xl text-boutique-ink">{featured.title}</h2>
                <p className="mt-4 text-sm leading-relaxed text-boutique-muted">{featured.excerpt}</p>
                <Link href={`/blog/${featured.slug}`} className="mt-6 text-sm font-semibold text-boutique-accent">Прочети статията →</Link>
              </div>
            </article>
          </PageContainer>
        </section>
      ) : null}

      <section className="pb-24 pt-8">
        <PageContainer>
          <div className="flex items-end justify-between gap-4">
            <div><p className="text-xs uppercase tracking-wider text-boutique-accent">Всички статии</p><h2 className="mt-2 font-heading text-3xl text-boutique-ink">Последни публикации</h2></div>
            <p className="text-sm text-boutique-muted">Намерени: {filtered.length}</p>
          </div>
          {filtered.length === 0 ? <p className="mt-10 rounded-2xl border border-dashed border-boutique-line p-10 text-center text-boutique-muted">Няма публикации по тези критерии.</p> : (
            <div className="mt-8 grid gap-7 md:grid-cols-2 lg:grid-cols-3">
              {filtered.map((post) => (
                <article key={post.id} className="overflow-hidden rounded-2xl border border-boutique-line bg-boutique-paper shadow-boutique-sm">
                  <Link href={`/blog/${post.slug}`} className="block aspect-[4/3]"><ContentImage src={post.image_url} alt={post.title} label="Снимка за публикацията" /></Link>
                  <div className="p-6">
                    <p className="text-xs uppercase tracking-wider text-boutique-accent">{post.category ?? "Блог"} {post.is_popular ? "· Популярна" : ""}</p>
                    <h2 className="mt-3 font-heading text-2xl"><Link href={`/blog/${post.slug}`}>{post.title}</Link></h2>
                    <p className="mt-3 text-sm leading-relaxed text-boutique-muted">{post.excerpt}</p>
                    <p className="mt-4 text-xs text-boutique-muted">{post.author ?? "VeMiDi crafts"}{post.read_minutes ? ` · ${post.read_minutes} мин. четене` : ""}</p>
                  </div>
                </article>
              ))}
            </div>
          )}
          <div className="mt-16">
            <NewsletterForm />
          </div>
        </PageContainer>
      </section>
    </div>
  );
}
