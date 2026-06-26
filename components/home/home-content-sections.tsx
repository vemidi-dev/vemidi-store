import Link from "next/link";

import { FaqSection } from "@/components/faq/faq-section";
import { ContentImage } from "@/components/content/content-image";
import { NewsletterForm } from "@/components/content/newsletter-form";
import { PageContainer } from "@/components/layout/page-container";
import type { BlogPostRow, EventRow } from "@/lib/admin/types";
import type { FaqItem } from "@/lib/faq/types";
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

function UpcomingEventCard({ event }: { event: EventRow }) {
  const date = formatEventDate(event.starts_at);

  return (
    <article className="grid items-center gap-4 rounded-xl border border-boutique-line bg-boutique-warm/55 p-4 sm:grid-cols-[4.5rem_1fr_auto]">
      <div className="border-r border-boutique-line pr-4 text-center">
        <p className="font-heading text-3xl leading-none text-boutique-ink">{date.day}</p>
        <p className="mt-1 text-xs font-semibold uppercase text-boutique-sage-deep">
          {date.month}
        </p>
      </div>
      <div>
        <h3 className="font-heading text-lg leading-snug text-boutique-ink">
          <Link href={`/sabitiya/${event.slug}`} className="hover:text-boutique-sage-deep">
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
}

function PastEventCard({ event }: { event: EventRow }) {
  return (
    <article>
      <Link
        href={`/sabitiya/${event.slug}`}
        className="group block overflow-hidden rounded-lg border border-boutique-line/80 bg-white"
      >
        <div className="aspect-[4/3] overflow-hidden bg-boutique-warm">
          <ContentImage
            src={event.image_url}
            alt={event.title}
            label="Снимка от събитието"
          />
        </div>
        <h3 className="px-2.5 py-2 font-heading text-sm leading-snug text-boutique-ink transition group-hover:text-boutique-sage-deep line-clamp-2">
          {event.title}
        </h3>
      </Link>
    </article>
  );
}

export function HomeContentGrid({
  posts,
  upcomingEvents,
  pastEvents,
  faqItems = [],
}: {
  posts: BlogPostRow[];
  upcomingEvents: EventRow[];
  pastEvents: EventRow[];
  faqItems?: FaqItem[];
}) {
  return (
    <>
      <section className="border-b border-boutique-line bg-boutique-paper py-12 md:py-20">
        <PageContainer className="grid gap-14 md:max-w-7xl lg:grid-cols-2 lg:gap-0">
          <div className="lg:border-r lg:border-boutique-line lg:pr-12">
            <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
              <h2 className="font-heading text-3xl tracking-tight text-boutique-ink md:text-4xl">Последни от блога</h2>
              <Link
                href="/blog"
                className="text-xs font-semibold text-boutique-sage-deep underline-offset-4 hover:underline"
              >
                Вижте всички статии
              </Link>
            </div>

            {posts.length ? (
              <div className="mt-8 grid gap-7 sm:grid-cols-3 sm:gap-5">
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
                    <h3 className="mt-3 font-heading text-lg leading-snug text-boutique-ink">
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

          <div className="lg:pl-12">
            <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
              <h2 className="font-heading text-3xl tracking-tight text-boutique-ink md:text-4xl">Предстоящи събития</h2>
              <Link
                href="/sabitiya"
                className="text-xs font-semibold text-boutique-sage-deep underline-offset-4 hover:underline"
              >
                Вижте всички събития
              </Link>
            </div>

            {upcomingEvents.length ? (
              <div className="mt-6 grid gap-3">
                {upcomingEvents.map((event) => (
                  <UpcomingEventCard key={event.id} event={event} />
                ))}
              </div>
            ) : (
              <p className="mt-4 text-xs leading-relaxed text-boutique-muted/80">
                В момента няма предстоящи събития.
              </p>
            )}

            {pastEvents.length ? (
              <div
                className={`${
                  upcomingEvents.length ? "mt-6 border-t border-boutique-line/60 pt-5" : "mt-4"
                }`}
              >
                <h3 className="text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-boutique-muted">
                  Минали събития
                </h3>
                <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {pastEvents.map((event) => (
                    <PastEventCard key={event.id} event={event} />
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </PageContainer>
      </section>
      <FaqSection idPrefix="home-faq" items={faqItems} variant="home" />
      <NewsletterForm variant="horizontal" defaultTopic="products" />
    </>
  );
}
