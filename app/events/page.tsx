import type { Metadata } from "next";

import { EventGallerySection } from "@/components/content/event-gallery-section";
import { EventNotificationForm } from "@/components/content/event-notification-form";
import { EventCard } from "@/components/content/event-card";
import { PastEventsGrid } from "@/components/content/past-events-grid";
import { EventsSchedule } from "@/components/content/events-schedule";
import { PageContainer } from "@/components/layout/page-container";
import { VisualPageHero } from "@/components/layout/visual-page-hero";
import type { EventRow } from "@/lib/admin/types";
import { getPublishedEvents } from "@/lib/content/repository";
import {
  getSiteMediaMap,
  resolveSiteMediaFromMap,
} from "@/lib/content/site-media";
import { OG_DEFAULTS } from "@/lib/seo/social-images";
import { toCalendarEvent } from "@/lib/events/calendar";
import { comparePastEvents, PAST_EVENTS_PAGE_SIZE } from "@/lib/events/past-events";

export async function generateMetadata(): Promise<Metadata> {
  const siteMediaMap = await getSiteMediaMap();
  const heroImage = resolveSiteMediaFromMap(siteMediaMap, "events.hero");
  const title = "Творчески работилници за деца";
  const description =
    "Предстоящи творчески работилници за деца и снимки от минали събития в ателието на VeMiDi.";
  return {
    title,
    description,
    alternates: { canonical: "/sabitiya" },
    openGraph: {
      type: "website",
      ...OG_DEFAULTS,
      title,
      description,
      url: "/sabitiya",
      images: heroImage.src
        ? [{ url: heroImage.src, alt: title }]
        : undefined,
    },
    twitter: {
      card: heroImage.src ? "summary_large_image" : "summary",
      title,
      description,
      images: heroImage.src ? [heroImage.src] : undefined,
    },
  };
}

function getEventTime(event: EventRow) {
  return event.ends_at ?? event.starts_at;
}

function UpcomingEvents({ events }: { events: EventRow[] }) {
  return (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
          {events.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>
  );
}

function PastEvents({ events, before }: { events: EventRow[]; before: number }) {
  return (
    <section className="py-14 md:py-18">
      <PageContainer className="2xl:max-w-[1440px]">
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
          <PastEventsGrid before={before} totalCount={events.length} initialCards={events.slice(0, PAST_EVENTS_PAGE_SIZE).map((event) => ({ id: event.id, content: <EventCard event={event} past /> }))} />
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

export default async function EventsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const [events, siteMediaMap, params] = await Promise.all([
    getPublishedEvents(),
    getSiteMediaMap(),
    searchParams,
  ]);
  const heroImage = resolveSiteMediaFromMap(siteMediaMap, "events.hero");
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
    .sort(comparePastEvents);

  return (
    <div>
      <VisualPageHero
        eyebrow="Творчество и споделено време"
        title="Събития"
        description="Творчески работилници за деца в моето ателие – място, където въображението оживява и малките творци създават с радост."
        descriptionAs="h2"
        imageSrc={heroImage.src}
        imageAlt={heroImage.alt}
      />

      <EventsSchedule events={events.map(toCalendarEvent)} now={now} view={params.view === "calendar" ? "calendar" : "cards"}>
        {upcomingEvents.length ? <UpcomingEvents events={upcomingEvents} /> : <p className="py-6 text-sm text-boutique-muted">В момента няма предстоящи събития.</p>}
      </EventsSchedule>
      <PastEvents events={pastEvents} before={now} />
      <EventGallerySection />
      {upcomingEvents.length === 0 ? <NoUpcomingEvents /> : null}
      <EventNotificationForm />
    </div>
  );
}
