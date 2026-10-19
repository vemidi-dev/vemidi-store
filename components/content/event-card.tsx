import Link from "next/link";
import { CalendarDays, Clock3, UserRound, Users } from "lucide-react";
import { ContentImage } from "@/components/content/content-image";
import { EventSocialActions } from "@/components/content/event-social-actions";
import type { EventRow } from "@/lib/admin/types";
import { formatEventPrice } from "@/lib/events/pricing";
import { eventFacebookUrl } from "@/lib/events/social-links";
import { getEventMapLink } from "@/lib/events/map-link";

export function EventCard({ event, featured = false, past = false }: { event: EventRow; featured?: boolean; past?: boolean }) {
  const date = event.starts_at ? new Date(event.starts_at) : null;
  const timeFormat = new Intl.DateTimeFormat("bg-BG", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Sofia" });
  const end = event.ends_at ? new Date(event.ends_at) : date && event.duration_minutes ? new Date(date.getTime() + event.duration_minutes * 60000) : null;
  const facts = [
    { icon: CalendarDays, text: date ? new Intl.DateTimeFormat("bg-BG", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Sofia" }).format(date) : "Датата предстои" },
    { icon: Clock3, text: date ? `${timeFormat.format(date)}${end ? ` – ${timeFormat.format(end)}` : ""} ч.` : null },
  ];
  const availability = past ? null : event.available_spots !== null ? event.available_spots === 0 ? "Местата са запълнени" : `${event.available_spots} свободни места` : event.capacity !== null ? `До ${event.capacity} участници` : null;
  const mapUrl = event.format === "online" ? null : getEventMapLink(event);
  const price = formatEventPrice(event);
  return <article className={`flex min-w-0 h-full flex-col overflow-hidden rounded-lg border border-boutique-line bg-white ${featured ? "sm:grid sm:grid-cols-2" : ""}`}>
    <Link href={`/sabitiya/${event.slug}`} className={`block aspect-[16/10] overflow-hidden bg-boutique-warm ${featured ? "sm:aspect-auto sm:min-h-80" : ""}`}><ContentImage src={event.image_url} alt={event.title} label="Снимка на събитието" fit="contain" /></Link>
    <div className="flex min-w-0 flex-1 flex-col p-4">
      <h3 className="min-h-14 break-words font-heading text-xl leading-snug text-boutique-ink"><Link href={`/sabitiya/${event.slug}`} title={event.title} className="line-clamp-2 transition hover:text-boutique-sage-deep">{event.title}</Link></h3>
      <ul className="mt-3 space-y-1 text-sm leading-6 text-boutique-ink">{facts.filter((fact) => fact.text).map(({ icon: Icon, text }, index) => <li key={index} className="flex items-start gap-2"><Icon aria-hidden="true" className="mt-1 h-4 w-4 shrink-0 text-boutique-sage-deep" /><span className="min-w-0 whitespace-pre-line break-words">{text}</span></li>)}
        {event.age_group || availability ? <li className="flex flex-wrap items-center gap-x-3 gap-y-1">
          {event.age_group ? <span className="flex min-w-0 items-center gap-2"><UserRound aria-hidden="true" className="h-4 w-4 shrink-0 text-boutique-sage-deep" /><span className="break-words">{event.age_group}</span></span> : null}
          {availability ? <span className={`flex min-w-0 items-center gap-2 ${event.age_group ? "border-l border-boutique-line pl-3" : ""}`}><Users aria-hidden="true" className="h-4 w-4 shrink-0 text-boutique-sage-deep" /><span className="break-words">{availability}</span></span> : null}
        </li> : null}
        {event.format === "online" ? <li>Онлайн</li> : null}
      </ul>
      {price ? <div className="mt-3 border-t border-boutique-line pt-3"><p className="whitespace-pre-line break-words text-base font-semibold leading-relaxed text-boutique-sage-deep">{price}</p><p className="mt-1 text-xs text-boutique-muted">на участник · Плащане на място</p></div> : null}
      <div className="mt-auto pt-3"><Link href={`/sabitiya/${event.slug}`} className="inline-flex min-h-10 items-center rounded-lg bg-boutique-sage-deep px-4 py-2 text-sm font-semibold text-white transition hover:bg-boutique-ink">Вижте подробности</Link><EventSocialActions compact slug={event.slug} title={event.title} mapUrl={mapUrl ?? undefined} facebookUrl={eventFacebookUrl(event.registration_settings)} /></div>
    </div>
  </article>;
}
