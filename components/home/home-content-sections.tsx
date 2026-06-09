import Link from "next/link";

import { ContentImage } from "@/components/content/content-image";
import { PageContainer } from "@/components/layout/page-container";
import type { BlogPostRow, EventRow } from "@/lib/admin/types";
import { formatEur } from "@/lib/format-eur";

function formatDate(value: string | null, includeTime = false) {
  if (!value) return null;

  return new Intl.DateTimeFormat("bg-BG", {
    dateStyle: "long",
    ...(includeTime ? { timeStyle: "short" as const } : {}),
    timeZone: "Europe/Sofia",
  }).format(new Date(value));
}

export function HomeEvents({ events }: { events: EventRow[] }) {
  return (
    <section className="border-y border-boutique-line bg-boutique-paper py-16 md:py-20">
      <PageContainer>
        <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div>
            <p className="text-[0.7rem] font-semibold uppercase tracking-[0.28em] text-boutique-accent">
              Срещи и творчество
            </p>
            <h2 className="font-heading mt-3 text-3xl text-boutique-ink sm:text-4xl">
              Предстоящи събития
            </h2>
          </div>
          <Link
            href="/events"
            className="text-sm font-semibold text-boutique-accent underline-offset-4 hover:underline"
          >
            Виж всички събития
          </Link>
        </div>

        {events.length ? (
          <div className="mt-10 grid gap-7 md:grid-cols-3">
            {events.map((event) => (
              <article key={event.id} className="overflow-hidden rounded-3xl border border-boutique-line bg-boutique-bg">
                <div className="aspect-[4/3]">
                  <ContentImage src={event.image_url} alt={event.title} label="Снимка за събитието" />
                </div>
                <div className="p-6">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-boutique-accent">
                    {formatDate(event.starts_at, true) ?? "Очаквайте дата"}
                  </p>
                  <h3 className="font-heading mt-3 text-2xl text-boutique-ink">{event.title}</h3>
                  <div className="mt-4 space-y-1 text-sm text-boutique-muted">
                    <p>{event.location || (event.format === "online" ? "Онлайн" : "Мястото предстои")}</p>
                    <p>
                      {event.price !== null ? formatEur(event.price) : "Цената предстои"}
                      {event.available_spots !== null ? ` · ${event.available_spots} свободни места` : ""}
                    </p>
                  </div>
                  <Link
                    href={`/events/${event.slug}`}
                    className="mt-5 inline-flex text-sm font-semibold text-boutique-ink underline-offset-4 hover:underline"
                  >
                    Виж подробности
                  </Link>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <p className="mt-8 rounded-2xl border border-boutique-line p-6 text-sm text-boutique-muted">
            Новите работилници и събития ще бъдат публикувани тук.
          </p>
        )}
      </PageContainer>
    </section>
  );
}

export function HomeBlog({ posts }: { posts: BlogPostRow[] }) {
  return (
    <section className="bg-boutique-bg py-16 md:py-20">
      <PageContainer>
        <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div>
            <p className="text-[0.7rem] font-semibold uppercase tracking-[0.28em] text-boutique-accent">
              Идеи и вдъхновение
            </p>
            <h2 className="font-heading mt-3 text-3xl text-boutique-ink sm:text-4xl">От блога</h2>
          </div>
          <Link
            href="/blog"
            className="text-sm font-semibold text-boutique-accent underline-offset-4 hover:underline"
          >
            Всички статии
          </Link>
        </div>

        {posts.length ? (
          <div className="mt-10 grid gap-7 md:grid-cols-3">
            {posts.map((post) => (
              <article key={post.id} className="overflow-hidden rounded-3xl border border-boutique-line bg-boutique-paper">
                <div className="aspect-[4/3]">
                  <ContentImage src={post.image_url} alt={post.title} label="Снимка за статията" />
                </div>
                <div className="p-6">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-boutique-accent">
                    {post.category || "От ателието"}
                    {post.published_at ? ` · ${formatDate(post.published_at)}` : ""}
                  </p>
                  <h3 className="font-heading mt-3 text-2xl text-boutique-ink">{post.title}</h3>
                  <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-boutique-muted">
                    {post.excerpt}
                  </p>
                  <Link
                    href={`/blog/${post.slug}`}
                    className="mt-5 inline-flex text-sm font-semibold text-boutique-ink underline-offset-4 hover:underline"
                  >
                    Прочети статията
                  </Link>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <p className="mt-8 rounded-2xl border border-boutique-line p-6 text-sm text-boutique-muted">
            Първите истории и творчески идеи скоро ще се появят тук.
          </p>
        )}
      </PageContainer>
    </section>
  );
}
