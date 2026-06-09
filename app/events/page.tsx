import type { Metadata } from "next";
import Link from "next/link";
import { ContentImage } from "@/components/content/content-image";
import { PageContainer } from "@/components/layout/page-container";
import { PageHero } from "@/components/ui/page-hero";
import { getPublishedEvents } from "@/lib/content/repository";
import { formatEur } from "@/lib/format-eur";

export const metadata: Metadata = { title: "Събития и работилници", description: "Предстоящи и минали събития на VeMiDi crafts.", alternates: { canonical: "/events" } };
type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };
const first = (v: string | string[] | undefined) => Array.isArray(v) ? v[0] ?? "" : v ?? "";
const dateText = (v: string | null) => v ? new Intl.DateTimeFormat("bg-BG", { dateStyle: "long", timeStyle: "short", timeZone: "Europe/Sofia" }).format(new Date(v)) : "Дата предстои";

export default async function EventsPage({ searchParams }: Props) {
  const params = await searchParams;
  const status = first(params.status) || "upcoming";
  const type = first(params.type);
  const audience = first(params.audience);
  const format = first(params.format);
  const events = await getPublishedEvents();
  const now = Date.now();
  const filtered = events.filter((event) => {
    const isPast = event.ends_at ? new Date(event.ends_at).getTime() < now : event.starts_at ? new Date(event.starts_at).getTime() < now : false;
    return (status === "past" ? isPast : !isPast) && (!type || event.event_type === type) && (!audience || event.audience === audience) && (!format || event.format === format);
  });

  return (
    <div>
      <PageHero eyebrow="Срещи на живо" title="Събития и работилници" description="Предстоящи творчески срещи и архив на вече проведените събития." />
      <section className="border-b border-boutique-line bg-boutique-bg py-8">
        <PageContainer>
          <form className="grid gap-3 rounded-2xl border border-boutique-line bg-boutique-paper p-4 sm:grid-cols-2 lg:grid-cols-5">
            <select name="status" defaultValue={status} className="rounded-lg border border-boutique-line p-3"><option value="upcoming">Предстоящи</option><option value="past">Минали</option></select>
            <select name="type" defaultValue={type} className="rounded-lg border border-boutique-line p-3"><option value="">Всички типове</option>{["Работилница","Базар","Изложба","Специално събитие"].map(v=><option key={v}>{v}</option>)}</select>
            <select name="audience" defaultValue={audience} className="rounded-lg border border-boutique-line p-3"><option value="">За всички</option>{["Деца","Възрастни","Семейства"].map(v=><option key={v}>{v}</option>)}</select>
            <select name="format" defaultValue={format} className="rounded-lg border border-boutique-line p-3"><option value="">Всеки формат</option><option value="in_person">На място</option><option value="online">Онлайн</option></select>
            <button className="rounded-lg bg-boutique-ink px-5 py-3 text-sm font-semibold text-boutique-paper">Филтрирай</button>
          </form>
        </PageContainer>
      </section>
      <section className="pb-24 pt-10"><PageContainer>
        <h2 className="font-heading text-3xl text-boutique-ink">{status === "past" ? "Минали събития" : "Предстоящи събития"}</h2>
        {filtered.length === 0 ? <p className="mt-8 rounded-2xl border border-dashed border-boutique-line p-10 text-center text-boutique-muted">Няма събития по тези критерии.</p> : (
          <div className="mt-8 space-y-8">{filtered.map(event => (
            <article key={event.id} className="overflow-hidden rounded-3xl border border-boutique-line bg-boutique-paper shadow-boutique-sm lg:grid lg:grid-cols-[0.8fr_1.2fr]">
              <Link href={`/events/${event.slug}`} className="block aspect-[4/3] lg:aspect-auto"><ContentImage src={event.image_url} alt={event.title} label="Снимка от събитието" dark /></Link>
              <div className="p-7 md:p-10">
                <p className="text-xs font-semibold uppercase tracking-wider text-boutique-accent">{event.event_type ?? "Събитие"} · {dateText(event.starts_at)}</p>
                <h3 className="mt-3 font-heading text-3xl"><Link href={`/events/${event.slug}`}>{event.title}</Link></h3>
                <div className="mt-3 flex flex-wrap gap-3 text-sm text-boutique-muted"><span>{event.format === "online" ? "Онлайн" : event.location ?? "Мястото предстои"}</span>{event.price !== null ? <span>{formatEur(event.price)}</span> : null}{event.available_spots !== null ? <span>{event.available_spots} свободни места</span> : null}{event.age_group ? <span>{event.age_group}</span> : null}</div>
                <p className="mt-4 text-sm leading-relaxed text-boutique-muted">{event.excerpt}</p>
                <Link href={`/events/${event.slug}`} className="mt-6 inline-flex rounded-full bg-boutique-ink px-6 py-3 text-sm font-semibold text-boutique-paper">{status === "past" ? "Виж архива" : "Виж подробности"}</Link>
              </div>
            </article>
          ))}</div>
        )}
      </PageContainer></section>
    </div>
  );
}
