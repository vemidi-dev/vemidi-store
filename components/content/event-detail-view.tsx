import Link from "next/link";
import type { ReactNode } from "react";

import { ContentDetail } from "@/components/content/content-detail";
import { EventRegistrationForm } from "@/components/content/event-registration-form";
import { JsonLd } from "@/components/seo/json-ld";
import type { EventRow } from "@/lib/admin/types";
import { formatEur } from "@/lib/format-eur";
import {
  buildBreadcrumbListSchema,
  buildEventBreadcrumbItems,
} from "@/lib/seo/breadcrumbs";
import { buildEventSchema } from "@/lib/seo/event-schema";
import { withPlainTextClass } from "@/lib/plain-text";
import { getSiteUrl } from "@/lib/site-url";

type EventDetailViewProps = {
  event: EventRow;
  relatedEvents?: EventRow[];
  idempotencyKey?: string;
  includeStructuredData?: boolean;
  previewBanner?: ReactNode;
};

function formatEventDate(value: string | null) {
  if (!value) return null;
  return new Intl.DateTimeFormat("bg-BG", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "Europe/Sofia",
  }).format(new Date(value));
}

export function EventDetailView({
  event,
  relatedEvents = [],
  idempotencyKey,
  includeStructuredData = true,
  previewBanner,
}: EventDetailViewProps) {
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
    !previewBanner &&
    !event.registration_url &&
    !hasStarted &&
    event.available_spots !== null &&
    event.available_spots > 0 &&
    Boolean(idempotencyKey);
  const siteUrl = getSiteUrl();
  const eventSchema = buildEventSchema(event, siteUrl);
  const structuredData = [
    ...(eventSchema ? [eventSchema] : []),
    buildBreadcrumbListSchema(buildEventBreadcrumbItems(event), siteUrl),
  ];

  return (
    <>
      {previewBanner}
      {includeStructuredData ? <JsonLd data={structuredData} /> : null}
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
            {detailRows.map(([label, value]) => (
              <div key={label}>
                <dt className="text-xs font-semibold uppercase tracking-wider text-boutique-muted">{label}</dt>
                <dd className="mt-1 text-boutique-ink">{value}</dd>
              </div>
            ))}
          </dl>
        ) : null}
        {event.includes_text ? (
          <section>
            <h2 className="font-heading text-2xl text-boutique-ink">Какво е включено</h2>
            <p className={withPlainTextClass("mt-2 text-boutique-muted")}>{event.includes_text}</p>
          </section>
        ) : null}
        {event.materials_text ? (
          <section>
            <h2 className="font-heading text-2xl text-boutique-ink">Необходими материали</h2>
            <p className={withPlainTextClass("mt-2 text-boutique-muted")}>{event.materials_text}</p>
          </section>
        ) : null}
        {event.cancellation_policy ? (
          <section>
            <h2 className="font-heading text-2xl text-boutique-ink">Условия за отказ</h2>
            <p className={withPlainTextClass("mt-2 text-boutique-muted")}>{event.cancellation_policy}</p>
          </section>
        ) : null}
        {previewBanner ? (
          <p className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm font-semibold text-amber-950">
            Това е администраторски преглед. Формата за записване е скрита, за да не създава тестови заявки.
          </p>
        ) : event.registration_url ? (
          <a href={event.registration_url} className="inline-flex rounded-full bg-boutique-ink px-7 py-3 text-sm font-semibold text-boutique-paper">Запиши се</a>
        ) : canRegisterInternally && idempotencyKey ? (
          <EventRegistrationForm
            eventId={event.id}
            eventSlug={event.slug}
            availableSpots={event.available_spots ?? 0}
            idempotencyKey={idempotencyKey}
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
