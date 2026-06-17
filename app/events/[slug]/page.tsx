import type { Metadata } from "next";
import { randomUUID } from "node:crypto";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ContentDetail } from "@/components/content/content-detail";
import { EventRegistrationForm } from "@/components/content/event-registration-form";
import { JsonLd } from "@/components/seo/json-ld";
import {
  getPublishedEvent,
  getPublishedEvents,
} from "@/lib/content/repository";
import { formatEur } from "@/lib/format-eur";
import {
  buildBreadcrumbListSchema,
  buildEventBreadcrumbItems,
} from "@/lib/seo/breadcrumbs";
import { buildEventSchema } from "@/lib/seo/event-schema";
import { getSiteUrl } from "@/lib/site-url";

type EventPageProps = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: EventPageProps): Promise<Metadata> {
  const { slug } = await params;
  const event = await getPublishedEvent(slug);
  if (!event) return { title: "Събитието не е намерено", robots: { index: false } };
  return {
    title: event.title,
    description: event.excerpt,
    alternates: { canonical: `/sabitiya/${slug}` },
    openGraph: {
      type: "article",
      title: event.title,
      description: event.excerpt,
      url: `/sabitiya/${slug}`,
      images: event.image_url ? [{ url: event.image_url, alt: event.title }] : undefined,
    },
  };
}

function formatEventDate(value: string | null) {
  if (!value) return null;
  return new Intl.DateTimeFormat("bg-BG", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "Europe/Sofia",
  }).format(new Date(value));
}

export default async function EventPage({ params }: EventPageProps) {
  const { slug } = await params;
  const [event, events] = await Promise.all([
    getPublishedEvent(slug),
    getPublishedEvents(),
  ]);
  if (!event) notFound();
  const relatedEvents = events
    .filter((candidate) => candidate.slug !== slug)
    .sort((a, b) => Number(b.event_type === event.event_type) - Number(a.event_type === event.event_type))
    .slice(0, 3);
  const meta = [formatEventDate(event.starts_at), event.location].filter(
    (value): value is string => Boolean(value),
  );
  const detailRows = [
    ["Продължителност", event.duration_minutes ? `${event.duration_minutes} минути` : null],
    ["Адрес", event.address],
    ["Цена", event.price !== null ? formatEur(event.price) : null],
    ["Свободни места", event.available_spots !== null ? String(event.available_spots) : null],
    ["Възрастова група", event.age_group],
    ["Водещ", event.host_name],
  ].filter((row): row is [string, string] => Boolean(row[1]));
  const hasStarted = event.starts_at ? new Date(event.starts_at).getTime() <= Date.now() : false;
  const canRegisterInternally =
    !event.registration_url &&
    !hasStarted &&
    event.available_spots !== null &&
    event.available_spots > 0;
  const siteUrl = getSiteUrl();
  const eventSchema = buildEventSchema(event, siteUrl);
  const structuredData = [
    ...(eventSchema ? [eventSchema] : []),
    buildBreadcrumbListSchema(buildEventBreadcrumbItems(event), siteUrl),
  ];

  return (
    <>
      <JsonLd data={structuredData} />
      <ContentDetail
      eyebrow="Събитие"
      title={event.title}
      excerpt={event.excerpt}
      content={event.content}
      imageUrl={event.image_url}
      meta={meta}
    >
      {detailRows.length ? (
        <dl className="grid gap-4 rounded-2xl border border-boutique-line bg-boutique-paper p-6 sm:grid-cols-2">
          {detailRows.map(([label, value]) => <div key={label}><dt className="text-xs font-semibold uppercase tracking-wider text-boutique-muted">{label}</dt><dd className="mt-1 text-boutique-ink">{value}</dd></div>)}
        </dl>
      ) : null}
      {event.includes_text ? <section><h2 className="font-heading text-2xl text-boutique-ink">Какво е включено</h2><p className="mt-2">{event.includes_text}</p></section> : null}
      {event.materials_text ? <section><h2 className="font-heading text-2xl text-boutique-ink">Необходими материали</h2><p className="mt-2">{event.materials_text}</p></section> : null}
      {event.cancellation_policy ? <section><h2 className="font-heading text-2xl text-boutique-ink">Условия за отказ</h2><p className="mt-2">{event.cancellation_policy}</p></section> : null}
      {event.registration_url ? (
        <a href={event.registration_url} className="inline-flex rounded-full bg-boutique-ink px-7 py-3 text-sm font-semibold text-boutique-paper">Запиши се</a>
      ) : canRegisterInternally ? (
        <EventRegistrationForm
          eventId={event.id}
          eventSlug={event.slug}
          availableSpots={event.available_spots ?? 0}
          idempotencyKey={randomUUID()}
        />
      ) : event.available_spots === 0 ? (
        <p className="rounded-2xl border border-boutique-line bg-boutique-paper p-5 font-semibold text-boutique-ink">
          Местата за това събитие са запълнени.
        </p>
      ) : hasStarted ? null : (
        <Link href="/kontakti" className="inline-flex rounded-full bg-boutique-ink px-7 py-3 text-sm font-semibold text-boutique-paper">Попитай за записване</Link>
      )}
      {relatedEvents.length ? (
        <section>
          <h2 className="font-heading text-2xl text-boutique-ink">Други събития</h2>
          <div className="mt-4 grid gap-3">
            {relatedEvents.map((related) => (
              <Link key={related.id} href={`/sabitiya/${related.slug}`} className="rounded-2xl border border-boutique-line bg-boutique-paper px-5 py-4 font-semibold text-boutique-ink hover:border-boutique-accent">
                {related.title}
              </Link>
            ))}
          </div>
        </section>
      ) : null}
    </ContentDetail>
    </>
  );
}
