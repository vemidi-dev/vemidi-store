import Link from "next/link";
import type { ReactNode } from "react";
import { CalendarDays, Clock3, ExternalLink, MapPin, MessageCircle, Timer, UserRound, Users, type LucideIcon } from "lucide-react";
import { ContentImage } from "@/components/content/content-image";
import { EventRegistrationForm } from "@/components/content/event-registration-form";
import { EventPhotoGallery } from "@/components/content/event-photo-gallery";
import { PageContainer } from "@/components/layout/page-container";
import { JsonLd } from "@/components/seo/json-ld";
import type { EventRow } from "@/lib/admin/types";
import { formatEur } from "@/lib/format-eur";
import { buildBreadcrumbListSchema, buildEventBreadcrumbItems } from "@/lib/seo/breadcrumbs";
import { buildEventSchema } from "@/lib/seo/event-schema";
import { BlogRichText } from "@/lib/content/blog-rich-text";
import { getSiteUrl } from "@/lib/site-url";
import { EVENT_PAYMENT_LABEL, parseEventRegistrationSettings } from "@/lib/events/registration-config";
import { getEventMapLink } from "@/lib/events/map-link";

type EventDetailViewProps = { event: EventRow; relatedEvents?: EventRow[]; idempotencyKey?: string; includeStructuredData?: boolean; previewBanner?: ReactNode };

const sectionLinkClass = "rounded-t-md border-b-2 border-transparent px-4 py-3 transition-colors hover:border-boutique-sage-deep hover:bg-boutique-sage/10 hover:text-boutique-sage-deep focus-visible:border-boutique-sage-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-boutique-sage-deep/40";
const contactLinkClass = "inline-flex items-center justify-center gap-2 rounded-md px-2 py-2 text-sm font-medium text-boutique-sage-deep underline underline-offset-4 transition-colors hover:bg-boutique-sage/10 hover:text-boutique-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-boutique-sage-deep/40";

function EventMapLink({ href }: { href: string }) {
  return <a href={href} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-md border border-boutique-sage-deep/25 px-3 py-2 text-sm font-medium text-boutique-sage-deep underline underline-offset-4 transition-colors hover:border-boutique-sage-deep hover:bg-boutique-sage/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-boutique-sage-deep/40"><MapPin aria-hidden="true" className="h-4 w-4 shrink-0" />Отвори в Google Maps<ExternalLink aria-hidden="true" className="h-3.5 w-3.5 shrink-0" /></a>;
}

export function EventDetailView({ event, relatedEvents = [], idempotencyKey, includeStructuredData = true, previewBanner }: EventDetailViewProps) {
  const now = Date.now();
  const hasStarted = Boolean(event.starts_at && new Date(event.starts_at).getTime() <= now);
  const full = event.available_spots === 0;
  const settings = parseEventRegistrationSettings(event.registration_settings);
  const canRegister = !settings.error && !event.registration_url && !full && event.available_spots !== null && (!hasStarted || Boolean(previewBanner));
  const date = event.starts_at ? new Intl.DateTimeFormat("bg-BG", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Sofia" }).format(new Date(event.starts_at)) : null;
  const clock = (value: string) => new Intl.DateTimeFormat("bg-BG", { hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZone: "Europe/Sofia" }).format(new Date(value));
  const end = event.ends_at ?? (event.starts_at && event.duration_minutes ? new Date(new Date(event.starts_at).getTime() + event.duration_minutes * 60000).toISOString() : null);
  const schedule = event.starts_at ? clock(event.starts_at) + (end ? ` – ${clock(end)}` : "") : null;
  const mapAddress = [event.location, event.address].filter(Boolean).join(", ");
  const mapUrl = getEventMapLink(event);
  const schema = buildEventSchema(event, getSiteUrl());
  const gallery = event.gallery_images ?? [];
  const supplementary = [["Какво е включено", event.includes_text], ["Необходими материали", event.materials_text], ["Водещ", event.host_name]].filter((row): row is [string, string] => Boolean(row[1]?.trim()));
  const upcoming = relatedEvents.filter((item) => new Date(item.starts_at ?? 0).getTime() > now).slice(0, 3);
  const facts: { label: string; value: string | null; Icon: LucideIcon; map?: boolean }[] = [
    { label: "Кога", value: date, Icon: CalendarDays },
    { label: "Час", value: schedule ? `${schedule}${event.duration_minutes ? ` · ${event.duration_minutes} минути` : ""}` : null, Icon: Clock3 },
    { label: "Място", value: [event.location, event.address].filter(Boolean).join("\n") || null, Icon: MapPin, map: true },
    { label: "Възраст", value: event.age_group, Icon: UserRound },
    { label: "Продължителност", value: !schedule && event.duration_minutes ? `${event.duration_minutes} минути` : null, Icon: Timer },
    { label: "Група", value: event.capacity ? `До ${event.capacity} участници` : null, Icon: Users },
  ];
  return <>
    {previewBanner}
    {includeStructuredData ? <JsonLd data={[...(schema ? [schema] : []), buildBreadcrumbListSchema(buildEventBreadcrumbItems(event), getSiteUrl())]} /> : null}
    <article className="bg-boutique-paper pb-14">
      <PageContainer className="max-w-6xl pt-6">
        <nav aria-label="Навигационна пътека" className="text-xs text-boutique-muted"><Link href="/">Начало</Link> / <Link href="/sabitiya">Събития</Link> / <span>{event.title}</span></nav>
        <header className="mx-auto max-w-4xl py-7 text-center">
          <h1 className="break-words font-heading text-3xl leading-tight text-boutique-ink sm:text-4xl">{event.title}</h1>
          <p className="mt-3 whitespace-pre-line text-base text-boutique-muted">{event.excerpt}</p>
        </header>
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1.6fr)_minmax(18rem,1fr)] lg:items-stretch">
          <div className="aspect-[4/3] min-w-0 overflow-hidden rounded-lg bg-boutique-warm lg:aspect-auto lg:min-h-96"><ContentImage src={event.image_url} alt={event.title} label="Снимка на работилницата" /></div>
          <aside aria-label="Информация и записване" className="min-w-0 rounded-lg border border-boutique-line bg-white p-5 sm:p-6">
            {event.available_spots !== null ? <p className="mb-5 inline-flex items-center gap-2 rounded-md bg-boutique-sage/15 px-3 py-2 text-sm font-semibold text-boutique-sage-deep"><Users aria-hidden="true" className="h-4 w-4 shrink-0" />{full ? "Местата са запълнени" : hasStarted ? "Записването е приключило" : `${event.available_spots} свободни места`}</p> : null}
            <dl className="space-y-4">{facts.filter((fact) => fact.value).map(({ label, value, Icon, map }) => <div key={label}><dt className="sr-only">{label}</dt><dd className="flex items-start gap-3 text-sm text-boutique-ink"><Icon aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-boutique-sage-deep" /><div className="min-w-0 flex-1"><p className="whitespace-pre-line break-words leading-6">{value}</p>{map && mapUrl ? <div className="mt-2"><EventMapLink href={mapUrl} /></div> : null}</div></dd></div>)}</dl>
            <div className="mt-5 border-t border-boutique-line pt-4">
              {event.price !== null ? <p className="font-heading text-3xl text-boutique-sage-deep">{formatEur(event.price)} <span className="font-sans text-sm text-boutique-muted">на участник</span></p> : null}
              <p className="mt-2 text-sm text-boutique-muted">{EVENT_PAYMENT_LABEL}</p>
              {canRegister ? <a href="#registration" className="mt-4 flex min-h-12 items-center justify-center rounded-lg bg-boutique-sage-deep px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-boutique-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-boutique-sage-deep/50 focus-visible:ring-offset-2">Запази място</a> : !hasStarted && !full && event.registration_url && !previewBanner ? <a href={event.registration_url} className="mt-4 flex min-h-12 items-center justify-center rounded-lg bg-boutique-sage-deep px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-boutique-ink">Запази място</a> : null}
              <div className="mt-2 text-center"><Link href="/kontakti" className={contactLinkClass}><MessageCircle aria-hidden="true" className="h-4 w-4 shrink-0" />Свържете се с нас</Link></div>
            </div>
          </aside>
        </div>
        <nav aria-label="Раздели на работилницата" className="my-7 flex flex-wrap justify-center gap-x-2 border-b border-boutique-line text-sm text-boutique-ink"><a href="#about" className={sectionLinkClass}>За работилницата</a>{gallery.length ? <a href="#photos" className={sectionLinkClass}>Снимки</a> : null}{canRegister ? <a href="#registration" className={sectionLinkClass}>Записване</a> : null}</nav>
        <div id="about" className="scroll-mt-28 py-3">
          <section className="min-w-0"><h2 className="mb-4 font-heading text-3xl text-boutique-ink">За работилницата</h2><BlogRichText content={event.content} preserveLineBreaks /></section>
          {supplementary.length ? <dl className="mt-5 space-y-2 rounded-lg border-l-2 border-boutique-sage/50 bg-boutique-sage/10 px-4 py-3 text-sm leading-6 text-boutique-muted">{supplementary.map(([label, value]) => <div key={label} className="flex flex-wrap gap-x-2"><dt className="font-medium text-boutique-ink">{label}:</dt><dd className="min-w-0 whitespace-pre-line break-words">{value.trim()}</dd></div>)}</dl> : null}
        </div>
        {gallery.length ? <section id="photos" className="scroll-mt-28 py-9"><h2 className="font-heading text-3xl text-boutique-ink">Снимки от работилницата</h2><EventPhotoGallery photos={gallery} /></section> : null}
        <section className="py-8"><h2 className="font-heading text-3xl text-boutique-ink">Полезно преди посещението</h2><div className="mt-5 grid gap-6 sm:grid-cols-2"><div><h3 className="flex items-center gap-2 font-semibold text-boutique-ink"><MapPin aria-hidden="true" className="h-5 w-5 text-boutique-sage-deep" />Място</h3><p className="mt-2 whitespace-pre-line text-sm leading-6 text-boutique-muted">{mapAddress || "Свържете се с нас за мястото на провеждане."}</p>{mapUrl ? <div className="mt-3"><EventMapLink href={mapUrl} /></div> : null}</div><div><h3 className="font-semibold text-boutique-ink">При промяна в плановете</h3><p className="mt-2 whitespace-pre-line text-sm leading-6 text-boutique-muted">{event.cancellation_policy || "Ако не можете да присъствате, свържете се с нас, за да освободим мястото."}</p><div className="mt-2"><Link href="/kontakti" className={contactLinkClass}><MessageCircle aria-hidden="true" className="h-4 w-4" />Свържете се с нас</Link></div></div></div></section>
        <div id="registration" className="scroll-mt-28 py-5">
          {canRegister && (idempotencyKey || previewBanner) ? <>
            {previewBanner ? <p className="mb-3 text-sm text-amber-900">Администраторски преглед — изпращането е изключено.</p> : null}
            <fieldset disabled={Boolean(previewBanner)} className="min-w-0"><EventRegistrationForm eventId={event.id} eventSlug={event.slug} availableSpots={event.available_spots ?? 0} idempotencyKey={idempotencyKey ?? ""} settings={event.registration_settings !== undefined && !settings.error ? settings.settings : undefined} price={event.price} /></fieldset>
          </> : full ? <p className="font-semibold text-boutique-ink">Местата за това събитие са запълнени.</p> : hasStarted ? <p className="text-sm text-boutique-muted">Записването за това събитие е приключило.</p> : !event.registration_url ? <Link href="/kontakti" className="text-sm text-boutique-sage-deep underline">Попитай за записване</Link> : null}
        </div>
        {upcoming.length ? <section className="pt-10"><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="font-heading text-3xl text-boutique-ink">Още творчески срещи</h2><Link href="/sabitiya" className="text-sm text-boutique-sage-deep underline">Всички събития</Link></div><div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{upcoming.map((related) => <Link key={related.id} href={`/sabitiya/${related.slug}`} className="overflow-hidden rounded-lg border border-boutique-line bg-white"><div className="aspect-[3/2]"><ContentImage src={related.image_url} alt={related.title} label="Снимка на работилницата" /></div><div className="p-4"><p className="text-xs text-boutique-sage-deep">Предстоящо{related.starts_at ? " · " + new Intl.DateTimeFormat("bg-BG", { day: "numeric", month: "long", timeZone: "Europe/Sofia" }).format(new Date(related.starts_at)) : ""}</p><h3 className="mt-2 font-heading text-xl text-boutique-ink">{related.title}</h3><p className="mt-3 text-sm font-semibold text-boutique-sage-deep">Виж работилницата →</p></div></Link>)}</div></section> : null}
      </PageContainer>
    </article>
  </>;
}
