import Link from "next/link";

import { ContentImage } from "@/components/content/content-image";
import { NewsletterForm } from "@/components/content/newsletter-form";
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

function formatEventDate(value: string | null) {
  if (!value) {
    return { day: "--", month: "скоро", time: "Очаквайте час" };
  }

  const date = new Date(value);
  return {
    day: new Intl.DateTimeFormat("bg-BG", {
      day: "2-digit",
      timeZone: "Europe/Sofia",
    }).format(date),
    month: new Intl.DateTimeFormat("bg-BG", {
      month: "short",
      timeZone: "Europe/Sofia",
    }).format(date).replace(".", ""),
    time: new Intl.DateTimeFormat("bg-BG", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Europe/Sofia",
    }).format(date),
  };
}

export function HomeContentGrid({
  posts,
  events,
}: {
  posts: BlogPostRow[];
  events: EventRow[];
}) {
  return (
    <>
      <section className="border-b border-boutique-line bg-boutique-paper py-14 md:py-16">
        <PageContainer className="grid gap-12 lg:grid-cols-2 lg:gap-0">
          <div className="lg:border-r lg:border-boutique-line lg:pr-10">
            <div className="flex items-end justify-between gap-4">
              <h2 className="font-heading text-3xl text-boutique-ink">Последни от блога</h2>
              <Link
                href="/blog"
                className="text-xs font-semibold text-boutique-sage-deep underline-offset-4 hover:underline"
              >
                Виж всички статии
              </Link>
            </div>

            {posts.length ? (
              <div className="mt-8 grid gap-5 sm:grid-cols-3">
                {posts.map((post) => (
                  <article key={post.id}>
                    <Link
                      href={`/blog/${post.slug}`}
                      className="block aspect-[4/3] overflow-hidden rounded-lg border border-boutique-line bg-boutique-warm"
                    >
                      <ContentImage
                        src={post.image_url}
                        alt={post.title}
                        label="Снимка за статията"
                      />
                    </Link>
                    <h3 className="mt-3 font-heading text-base leading-snug text-boutique-ink">
                      <Link href={`/blog/${post.slug}`} className="hover:text-boutique-sage-deep">
                        {post.title}
                      </Link>
                    </h3>
                    <p className="mt-2 text-xs text-boutique-muted">
                      {post.published_at ? formatDate(post.published_at) : "Скоро"}
                    </p>
                  </article>
                ))}
              </div>
            ) : (
              <p className="mt-8 rounded-xl border border-dashed border-boutique-line p-6 text-sm text-boutique-muted">
                Първите истории и творчески идеи скоро ще се появят тук.
              </p>
            )}
          </div>

          <div className="lg:pl-10">
            <div className="flex items-end justify-between gap-4">
              <h2 className="font-heading text-3xl text-boutique-ink">Предстоящи събития</h2>
              <Link
                href="/events"
                className="text-xs font-semibold text-boutique-sage-deep underline-offset-4 hover:underline"
              >
                Виж всички събития
              </Link>
            </div>

            {events.length ? (
              <div className="mt-8 grid gap-3">
                {events.map((event) => {
                  const date = formatEventDate(event.starts_at);
                  return (
                    <article
                      key={event.id}
                      className="grid items-center gap-4 rounded-lg border border-boutique-line bg-boutique-warm/55 p-4 sm:grid-cols-[4.5rem_1fr_auto]"
                    >
                      <div className="border-r border-boutique-line pr-4 text-center">
                        <p className="font-heading text-3xl leading-none text-boutique-ink">
                          {date.day}
                        </p>
                        <p className="mt-1 text-xs font-semibold uppercase text-boutique-sage-deep">
                          {date.month}
                        </p>
                      </div>
                      <div>
                        <h3 className="font-heading text-base leading-snug text-boutique-ink">
                          <Link href={`/events/${event.slug}`} className="hover:text-boutique-sage-deep">
                            {event.title}
                          </Link>
                        </h3>
                        <p className="mt-1 text-xs text-boutique-muted">
                          {event.price !== null ? formatEur(event.price) : "Цената предстои"}
                          {event.available_spots !== null
                            ? ` · ${event.available_spots} свободни места`
                            : ""}
                        </p>
                      </div>
                      <div className="text-xs leading-5 text-boutique-muted sm:text-right">
                        <p>⌖ {event.location || (event.format === "online" ? "Онлайн" : "Мястото предстои")}</p>
                        <p>◷ {date.time} ч.</p>
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : (
              <p className="mt-8 rounded-xl border border-dashed border-boutique-line p-6 text-sm text-boutique-muted">
                Новите работилници и събития ще бъдат публикувани тук.
              </p>
            )}
          </div>
        </PageContainer>
      </section>
      <NewsletterForm variant="horizontal" defaultTopic="products" />
    </>
  );
}
