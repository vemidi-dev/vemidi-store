import Link from "next/link";

import { FaqSection } from "@/components/faq/faq-section";
import { ContentImage } from "@/components/content/content-image";
import { NewsletterForm } from "@/components/content/newsletter-form";
import { PageContainer } from "@/components/layout/page-container";
import { HomePastEvents } from "@/components/home/home-past-events";
import type { BlogPostRow, EventRow } from "@/lib/admin/types";
import type { FaqItem } from "@/lib/faq/types";
import { formatEventPrice } from "@/lib/events/pricing";

function formatDate(value: string | null, includeTime = false) {
  if (!value) return null;

  return new Intl.DateTimeFormat("bg-BG", {
    dateStyle: "long",
    ...(includeTime ? { timeStyle: "short" as const } : {}),
    timeZone: "Europe/Sofia",
  }).format(new Date(value));
}

function UpcomingEventCard({ event, featured = false }: { event: EventRow; featured?: boolean }) {
  const date = formatDate(event.starts_at);
  const location = event.location || event.address || (event.format === "online" ? "Онлайн" : null);

  return (
    <article className="min-w-0">
      <Link href={`/sabitiya/${event.slug}`} className={`group flex h-full flex-col overflow-hidden rounded-lg border border-boutique-line bg-white transition hover:border-boutique-sage-deep/50 ${featured ? "sm:grid sm:grid-cols-2" : ""}`}>
        <div className={`aspect-[4/3] overflow-hidden bg-boutique-warm ${featured ? "sm:aspect-auto sm:min-h-80" : ""}`}>
          <ContentImage src={event.image_url} alt={event.title} label="Снимка на събитието" />
        </div>
        <div className="flex flex-1 flex-col p-5">
          {date ? <p className="text-sm font-semibold text-boutique-sage-deep"><time dateTime={event.starts_at ?? undefined}>{date}</time></p> : null}
          <h3 className="mt-3 break-words font-heading text-2xl leading-snug text-boutique-ink transition group-hover:text-boutique-sage-deep">{event.title}</h3>
          {event.excerpt ? <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-boutique-muted">{event.excerpt}</p> : null}
          {location ? <p className="mt-3 break-words text-sm text-boutique-muted">{location}</p> : null}
          <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-2 pt-5 text-sm">
            {formatEventPrice(event) ? <span className="font-semibold text-boutique-ink">{formatEventPrice(event)}</span> : null}
            {event.available_spots !== null ? <span className="text-boutique-muted">{event.available_spots === 0 ? "Местата са запълнени" : `${event.available_spots} свободни места`}</span> : null}
          </div>
          <span className="mt-4 text-sm font-semibold text-boutique-sage-deep">Разгледайте събитието <span aria-hidden>→</span></span>
        </div>
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
        <PageContainer className="grid gap-14 md:max-w-7xl">
          <div>
            <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
              <h2 className="font-heading text-3xl tracking-tight text-boutique-ink md:text-4xl">Водещи от блога</h2>
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
                Изберете водещи статии от админ панела, за да се покажат тук.
              </p>
            )}
          </div>

          <div className="min-w-0 border-t border-boutique-line pt-12">
            <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
              <h2 className="font-heading text-3xl text-boutique-ink md:text-4xl">Предстоящи събития</h2>
              <Link
                href="/sabitiya"
                className="text-xs font-semibold text-boutique-sage-deep underline-offset-4 hover:underline"
              >
                Вижте всички събития
              </Link>
            </div>

            {upcomingEvents.length ? (
              <div className={`mt-8 grid items-stretch gap-6 ${upcomingEvents.length === 1 ? "" : "sm:grid-cols-2 lg:grid-cols-3"}`}>
                {upcomingEvents.map((event) => (
                  <UpcomingEventCard key={event.id} event={event} featured={upcomingEvents.length === 1} />
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
                  upcomingEvents.length ? "mt-10 border-t border-boutique-line/60 pt-6" : "mt-4"
                }`}
              >
                <HomePastEvents events={pastEvents} />
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
