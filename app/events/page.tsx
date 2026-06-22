import type { Metadata } from "next";
import Link from "next/link";

import { EventGallerySection } from "@/components/content/event-gallery-section";
import { EventNotificationForm } from "@/components/content/event-notification-form";
import { ContentImage } from "@/components/content/content-image";
import { PageContainer } from "@/components/layout/page-container";
import { VisualPageHero } from "@/components/layout/visual-page-hero";
import type { EventRow } from "@/lib/admin/types";
import { getPublishedEvents } from "@/lib/content/repository";
import { formatEur } from "@/lib/format-eur";

export const metadata: Metadata = {
  title: "Творчески работилници за деца",
  description:
    "Предстоящи творчески работилници за деца и снимки от минали събития в ателието на VeMiDi.",
  alternates: { canonical: "/sabitiya" },
};

function getEventTime(event: EventRow) {
  return event.ends_at ?? event.starts_at;
}

function formatEventDate(value: string | null) {
  if (!value) return "Датата предстои";
  return new Intl.DateTimeFormat("bg-BG", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "Europe/Sofia",
  }).format(new Date(value));
}

function UpcomingEvents({ events }: { events: EventRow[] }) {
  return (
    <section className="border-b border-boutique-line bg-boutique-blush/25 py-14 md:py-18">
      <PageContainer>
        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-boutique-rose-deep">
            Заповядайте в ателието
          </p>
          <h2 className="mt-3 font-heading text-4xl text-boutique-ink">
            Предстоящи събития
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-boutique-muted">
            Малки групи, творчески занимания и уютно време, в което децата създават със
            собствените си ръце.
          </p>
        </div>

        <div className="mt-10 grid gap-6 lg:grid-cols-2">
          {events.map((event) => (
            <article
              key={event.id}
              className="overflow-hidden rounded-3xl border border-boutique-line bg-white shadow-boutique-sm"
            >
              <Link href={`/sabitiya/${event.slug}`} className="block aspect-[16/10]">
                <ContentImage
                  src={event.image_url}
                  alt={event.title}
                  label="Снимка за работилницата"
                />
              </Link>
              <div className="p-6 md:p-7">
                <p className="text-xs font-semibold uppercase tracking-[0.15em] text-boutique-rose-deep">
                  {formatEventDate(event.starts_at)}
                </p>
                <h3 className="mt-3 font-heading text-3xl text-boutique-ink">
                  <Link href={`/sabitiya/${event.slug}`}>{event.title}</Link>
                </h3>
                <p className="mt-3 text-sm leading-6 text-boutique-muted">{event.excerpt}</p>
                <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-sm text-boutique-muted">
                  <span>{event.location || event.address || "Ателието на VeMiDi"}</span>
                  {event.age_group ? <span>{event.age_group}</span> : null}
                  {event.price !== null ? <span>{formatEur(event.price)}</span> : null}
                  {event.available_spots !== null ? (
                    <span>{event.available_spots} свободни места</span>
                  ) : null}
                </div>
                <Link
                  href={`/sabitiya/${event.slug}`}
                  className="mt-6 inline-flex rounded-lg bg-boutique-rose-deep px-6 py-3 text-sm font-semibold text-white transition hover:bg-boutique-ink"
                >
                  Виж подробности
                </Link>
              </div>
            </article>
          ))}
        </div>
      </PageContainer>
    </section>
  );
}

function PastEvents({ events }: { events: EventRow[] }) {
  return (
    <section className="py-14 md:py-18">
      <PageContainer>
        <div className="text-center">
          <h2 className="font-heading text-4xl text-boutique-ink">Минали събития</h2>
          <div className="mx-auto mt-4 flex max-w-40 items-center gap-3 text-boutique-rose-deep">
            <span className="h-px flex-1 bg-boutique-rose/45" />
            <span className="font-heading text-xl">♡</span>
            <span className="h-px flex-1 bg-boutique-rose/45" />
          </div>
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-6 text-boutique-muted">
            Разгледайте част от заниманията, които вече сме организирали, и творбите,
            създадени от малките участници.
          </p>
        </div>

        {events.length ? (
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {events.map((event) => (
              <Link
                key={event.id}
                href={`/sabitiya/${event.slug}`}
                className="group overflow-hidden rounded-2xl border border-boutique-line bg-white shadow-boutique-sm transition hover:-translate-y-1 hover:shadow-boutique"
              >
                <div className="aspect-[4/3] overflow-hidden">
                  <ContentImage
                    src={event.image_url}
                    alt={event.title}
                    label="Снимка от миналото събитие"
                  />
                </div>
                <div className="p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-boutique-rose-deep">
                    {formatEventDate(event.starts_at)}
                  </p>
                  <h3 className="mt-2 font-heading text-2xl text-boutique-ink transition group-hover:text-boutique-rose-deep">
                    {event.title}
                  </h3>
                  <p className="mt-2 line-clamp-2 text-sm leading-6 text-boutique-muted">
                    {event.excerpt}
                  </p>
                  <span className="mt-4 inline-flex text-sm font-semibold text-boutique-sage-deep">
                    Виж събитието →
                  </span>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="mt-10 rounded-3xl border border-dashed border-boutique-line bg-boutique-paper p-10 text-center">
            <p className="font-heading text-2xl text-boutique-ink">
              Галерията скоро ще се появи тук
            </p>
            <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-boutique-muted">
              След публикуването на минали работилници снимките и историите от тях ще се
              подредят автоматично в тази секция.
            </p>
          </div>
        )}
      </PageContainer>
    </section>
  );
}

function NoUpcomingEvents() {
  return (
    <section className="border-y border-boutique-line bg-boutique-blush/25 py-14">
      <PageContainer>
        <div className="mx-auto max-w-3xl rounded-3xl border border-dashed border-boutique-rose/45 bg-white/75 px-6 py-12 text-center">
          <span className="mx-auto grid h-16 w-16 place-items-center rounded-full border border-boutique-rose/30 bg-boutique-paper font-heading text-2xl text-boutique-rose-deep">
            ♡
          </span>
          <h2 className="mt-5 font-heading text-3xl text-boutique-ink">
            В момента няма предстоящи събития
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-boutique-muted">
            Следете страницата или се абонирайте по-долу, за да получите имейл, когато
            обявим нова творческа работилница.
          </p>
        </div>
      </PageContainer>
    </section>
  );
}

export default async function EventsPage() {
  const events = await getPublishedEvents();
  const now = Date.now();
  const upcomingEvents = events
    .filter((event) => {
      const eventTime = getEventTime(event);
      return !eventTime || new Date(eventTime).getTime() >= now;
    })
    .sort(
      (a, b) =>
        new Date(a.starts_at ?? "9999-12-31").getTime() -
        new Date(b.starts_at ?? "9999-12-31").getTime(),
    );
  const pastEvents = events
    .filter((event) => {
      const eventTime = getEventTime(event);
      return Boolean(eventTime && new Date(eventTime).getTime() < now);
    })
    .sort(
      (a, b) =>
        new Date(b.starts_at ?? 0).getTime() - new Date(a.starts_at ?? 0).getTime(),
    );

  return (
    <div>
      <VisualPageHero
        eyebrow="Творчество и споделено време"
        title="Събития"
        description="Творчески работилници за деца в моето ателие – място, където въображението оживява и малките творци създават с радост."
        descriptionAs="h2"
        imageSrc="/assets/cover-events.png"
        imageAlt="Творчески работилници за деца в ателието VeMiDi"
      />

      {upcomingEvents.length ? <UpcomingEvents events={upcomingEvents} /> : null}
      <PastEvents events={pastEvents} />
      <EventGallerySection />
      {upcomingEvents.length === 0 ? <NoUpcomingEvents /> : null}
      <EventNotificationForm />
    </div>
  );
}
