"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, CalendarDays, ChevronLeft, ChevronRight, Clock3, UserRound } from "lucide-react";
import { ContentImage } from "@/components/content/content-image";
import { calendarDateLabel, calendarDays, calendarEventStatus, calendarEventTime, calendarMonthOptions, eventDateKey, groupCalendarEvents, isCalendarMonth, shiftCalendarMonth, type CalendarEvent } from "@/lib/events/calendar";

const statusLabels = { past: "Минало", full: "Няма места", upcoming: "Предстоящо" };
const statusStyles = { past: "bg-boutique-warm text-boutique-muted", full: "bg-amber-50 text-amber-900", upcoming: "bg-boutique-sage/15 text-boutique-sage-deep" };

function EventProgram({ events, now, activeId, showDate = false, onEntryRef }: { events: CalendarEvent[]; now: number; activeId?: string; showDate?: boolean; onEntryRef?: (id: string, element: HTMLElement | null) => void }) {
  return <div className="divide-y divide-boutique-line">{events.map((event) => {
    const status = calendarEventStatus(event, now);
    return <article key={event.id} ref={(element) => { onEntryRef?.(event.id, element); }} data-event-id={event.id} aria-current={activeId === event.id ? "true" : undefined} className={`min-w-0 scroll-mt-28 py-4 first:pt-0 last:pb-0 lg:scroll-mt-0 ${activeId === event.id ? "border-l-2 border-l-boutique-sage-deep bg-boutique-sage/10 pl-3" : ""}`}>
      {showDate && event.starts_at ? <p className="mb-2 text-xs font-semibold text-boutique-sage-deep first-letter:uppercase"><time dateTime={event.starts_at}>{calendarDateLabel(eventDateKey(event.starts_at)!)}</time></p> : null}
      <div className="flex items-start gap-3">
        <Link href={`/sabitiya/${event.slug}`} tabIndex={-1} aria-hidden="true" className="block h-16 w-20 shrink-0 overflow-hidden rounded-md"><ContentImage src={event.image_url} alt="" label="Работилница" sizes="80px" /></Link>
        <div className="min-w-0"><span className={`inline-block rounded px-2 py-0.5 text-xs font-semibold ${statusStyles[status]}`}>{statusLabels[status]}</span><h4 className="mt-1 break-words text-sm font-semibold leading-5 text-boutique-ink"><Link href={`/sabitiya/${event.slug}`} className="hover:underline">{event.title}</Link></h4></div>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-boutique-muted"><span className="inline-flex items-center gap-1.5"><Clock3 aria-hidden="true" className="h-3.5 w-3.5" />{calendarEventTime(event)} ч.</span>{event.age_group ? <span className="inline-flex items-center gap-1.5"><UserRound aria-hidden="true" className="h-3.5 w-3.5" />{event.age_group}</span> : null}</div>
      {event.priceLabel ? <p className="mt-2 whitespace-pre-line break-words text-sm font-semibold leading-5 text-boutique-sage-deep">{event.priceLabel}</p> : null}
      {status === "upcoming" && event.available_spots !== null ? <p className="mt-1 text-xs text-boutique-muted">{event.available_spots} свободни места</p> : null}
      <Link href={`/sabitiya/${event.slug}`} className="mt-3 inline-flex min-h-9 items-center gap-2 text-xs font-semibold text-boutique-sage-deep underline-offset-4 hover:underline">Вижте подробности<ArrowRight aria-hidden="true" className="h-3.5 w-3.5" /></Link>
    </article>;
  })}</div>;
}

export function EventCalendar({ events, now }: { events: CalendarEvent[]; now: number }) {
  const today = eventDateKey(now)!;
  const groups = useMemo(() => groupCalendarEvents(events), [events]);
  const [month, setMonth] = useState(today.slice(0, 7));
  const [selectedDay, setSelectedDay] = useState(() => [...groups.entries()].find(([day, items]) => day >= today && day.startsWith(today.slice(0, 7)) && items.some((item) => calendarEventStatus(item, now) !== "past"))?.[0] ?? [...groups.keys()].find((day) => day.startsWith(today.slice(0, 7))) ?? today);
  const [activeId, setActiveId] = useState<string>();
  const [visibleCount, setVisibleCount] = useState(5);
  const [scrollRequest, setScrollRequest] = useState<{ id: string } | null>(null);
  const entryRefs = useRef(new Map<string, HTMLElement>());
  const mobileEntryRefs = useRef(new Map<string, HTMLElement>());
  const days = calendarDays(month);
  const monthGroups = [...groups.entries()].filter(([day]) => day.startsWith(month));
  const monthEvents = monthGroups.flatMap(([, items]) => items);
  const count = monthGroups.reduce((total, [, items]) => total + items.length, 0);
  const undated = events.filter((event) => !event.starts_at || !eventDateKey(event.starts_at));
  const nextDay = [...groups.keys()].find((day) => day >= today && day.slice(0, 7) > month);
  const monthOptions = calendarMonthOptions(month);
  const weekColumns = "grid grid-cols-[repeat(5,minmax(0,1fr))_repeat(2,minmax(0,1.4fr))] lg:grid-cols-[repeat(5,minmax(0,1fr))_repeat(2,minmax(0,2fr))]";

  useEffect(() => {
    if (!scrollRequest) return;
    const desktop = window.matchMedia("(min-width: 1024px)").matches;
    const entries = desktop ? entryRefs.current : mobileEntryRefs.current;
    entries.get(scrollRequest.id)?.scrollIntoView({ block: desktop ? "nearest" : "start", behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
  }, [scrollRequest]);

  function selectCalendarDay(day: string, id?: string) {
    setSelectedDay(day);
    const items = groups.get(day) ?? [];
    const target = id ?? items[0]?.id;
    setActiveId(target);
    if (!target) { setScrollRequest(null); return; }
    const lastIndex = id ? monthEvents.findIndex((event) => event.id === id) : Math.max(...items.map((event) => monthEvents.findIndex((item) => item.id === event.id)));
    setVisibleCount((previous) => Math.max(previous, Math.ceil((lastIndex + 1) / 5) * 5));
    setScrollRequest({ id: target });
  }

  function changeMonth(value: string) {
    if (!isCalendarMonth(value)) return;
    setMonth(value);
    setSelectedDay(value === today.slice(0, 7) ? today : [...groups.keys()].find((day) => day.startsWith(value)) ?? `${value}-01`);
    setActiveId(undefined);
    setVisibleCount(5);
    setScrollRequest(null);
  }

  const arrowClass = "grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-boutique-line bg-white text-boutique-ink transition hover:border-boutique-sage-deep hover:bg-boutique-sage/10 disabled:opacity-30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-boutique-sage-deep";
  return <div className="min-w-0">
    <div className="flex flex-wrap items-end justify-between gap-4 border-y border-boutique-line py-4">
      <div className="flex min-w-0 flex-wrap items-end gap-x-5 gap-y-3">
        <label htmlFor="workshop-month" className="block text-xs text-boutique-muted">Избери месец<select id="workshop-month" value={month} onChange={(event) => changeMonth(event.target.value)} className="mt-2 block h-11 w-60 max-w-full rounded-lg border border-boutique-line bg-white px-3 text-sm font-semibold text-boutique-ink focus:border-boutique-sage-deep focus:outline focus:outline-2 focus:outline-boutique-sage/30">{monthOptions.map((value) => { const label = calendarDateLabel(value, true); return <option key={value} value={value}>{label.charAt(0).toUpperCase() + label.slice(1)}</option>; })}</select></label>
        <p className="pb-3 text-xs text-boutique-muted" aria-live="polite">{count === 1 ? "1 работилница през месеца" : `${count} работилници през месеца`}</p>
      </div>
      <div className="flex items-center gap-2">
        <button type="button" onClick={() => { changeMonth(today.slice(0, 7)); setSelectedDay(today); }} className="h-10 rounded-lg border border-boutique-line bg-white px-3 text-sm font-semibold text-boutique-sage-deep transition hover:bg-boutique-sage/10">Днес</button>
        <button type="button" aria-label="Предишен месец" title="Предишен месец" disabled={month === "1900-01"} onClick={() => changeMonth(shiftCalendarMonth(month, -1))} className={arrowClass}><ChevronLeft aria-hidden="true" className="h-4 w-4" /></button>
        <button type="button" aria-label="Следващ месец" title="Следващ месец" disabled={month === "2100-12"} onClick={() => changeMonth(shiftCalendarMonth(month, 1))} className={arrowClass}><ChevronRight aria-hidden="true" className="h-4 w-4" /></button>
      </div>
    </div>

    <div className="mt-5 grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1fr)_20rem]">
      <div className="min-w-0 self-start overflow-hidden rounded-lg border border-boutique-line bg-white" role="region" aria-label="Месечен календар">
        <div className={`${weekColumns} border-b border-boutique-line bg-boutique-sage/10`}>{["Пон", "Вт", "Ср", "Чет", "Пет", "Събота", "Неделя"].map((day, index) => <div key={day} className={`py-3 text-center text-xs font-semibold ${index >= 5 ? "bg-boutique-sage/10 text-boutique-sage-deep" : "text-boutique-muted"}`}><span className="lg:hidden">{["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Нд"][index]}</span><span className="hidden lg:inline">{day}</span></div>)}</div>
        <div className={weekColumns}>{days.map((day, index) => {
          const inMonth = day.startsWith(month);
          const items = inMonth ? groups.get(day) ?? [] : [];
          const weekend = index % 7 >= 5;
          return <div key={day} className={`min-h-20 min-w-0 border-b border-r border-boutique-line p-1 lg:p-1.5 ${index % 7 === 6 ? "border-r-0" : ""} ${index >= days.length - 7 ? "border-b-0" : ""} ${!inMonth ? "bg-boutique-paper/70" : selectedDay === day ? "bg-boutique-sage/10 ring-2 ring-inset ring-boutique-sage-deep" : weekend ? "bg-boutique-sage/5" : ""}`}>
            <div className="lg:hidden">
              {inMonth ? <button type="button" aria-label={`${calendarDateLabel(day)}, ${items.length === 1 ? "1 работилница" : `${items.length} работилници`}`} aria-pressed={selectedDay === day} aria-current={day === today ? "date" : undefined} onClick={() => selectCalendarDay(day)} className="mb-1 flex h-7 w-full justify-center rounded text-xs transition hover:bg-boutique-sage/15 focus-visible:outline focus-visible:outline-2"><span className={`grid h-7 w-7 place-items-center rounded-full font-semibold ${day === today ? "bg-boutique-sage-deep text-white" : "text-boutique-ink"}`}>{Number(day.slice(-2))}</span></button> : <span className="grid h-7 place-items-center text-xs text-boutique-muted/50">{Number(day.slice(-2))}</span>}
              <div className="space-y-1">{items.map((event) => <button key={event.id} type="button" title={event.title} aria-label={`${calendarEventTime(event)}, ${event.title}, ${statusLabels[calendarEventStatus(event, now)]}`} aria-pressed={activeId === event.id && selectedDay === day} onClick={() => selectCalendarDay(day, event.id)} className="flex min-h-12 w-full flex-col items-center gap-0.5 rounded bg-white p-0.5 text-boutique-ink shadow-sm transition hover:bg-boutique-sage/10 focus-visible:outline focus-visible:outline-2">
                <span className="block h-9 w-full max-w-14 overflow-hidden rounded bg-boutique-sage/15">{event.image_url ? <ContentImage src={event.image_url} alt="" label="Работилница" sizes="56px" /> : <CalendarDays aria-hidden="true" className="mx-auto mt-2 h-5 w-5 text-boutique-sage-deep" />}</span><span className="text-[10px] font-semibold leading-3">{calendarEventTime(event).split("–")[0]}</span>
              </button>)}</div>
            </div>
            {inMonth ? <button type="button" aria-label={calendarDateLabel(day)} aria-pressed={selectedDay === day} aria-current={day === today ? "date" : undefined} onClick={() => selectCalendarDay(day)} className={`mb-1 hidden h-8 w-8 place-items-center rounded-full text-xs font-semibold transition hover:bg-boutique-sage/20 focus-visible:outline focus-visible:outline-2 lg:grid ${day === today ? "bg-boutique-sage-deep text-white" : "text-boutique-ink"}`}>{Number(day.slice(-2))}</button> : <span className="mb-1 hidden h-8 w-8 place-items-center text-xs text-boutique-muted/50 lg:grid">{Number(day.slice(-2))}</span>}
            <div className="hidden space-y-1 lg:block">{items.map((event) => {
              const status = calendarEventStatus(event, now);
              return <button key={event.id} type="button" title={event.title} aria-label={`${calendarEventTime(event)}, ${event.title}, ${statusLabels[status]}`} aria-pressed={activeId === event.id && selectedDay === day} onClick={() => selectCalendarDay(day, event.id)} className={`w-full min-w-0 rounded border-l-2 bg-white p-1.5 text-left shadow-sm transition hover:shadow-md focus-visible:outline focus-visible:outline-2 ${weekend ? "flex items-start gap-2" : "block"} ${status === "past" ? "border-boutique-line text-boutique-muted" : status === "full" ? "border-amber-500 text-amber-900" : "border-boutique-sage-deep text-boutique-ink"}`}>
                {event.image_url ? <span className={`block overflow-hidden rounded ${weekend ? "h-14 w-12 shrink-0 2xl:w-14" : "mb-1.5 aspect-[4/3] w-full"}`}><ContentImage src={event.image_url} alt="" label="Работилница" sizes={weekend ? "56px" : "96px"} /></span> : null}
                <span className="block min-w-0"><span className="block text-xs font-semibold">{calendarEventTime(event).split("–")[0]}</span><span className="mt-0.5 line-clamp-2 break-words text-xs leading-4">{event.title}</span>{status !== "upcoming" ? <span className="mt-1 block text-[10px] font-semibold">{statusLabels[status]}</span> : null}</span>
              </button>;
            })}</div>
          </div>;
        })}</div>
      </div>
      <aside className="hidden max-h-[44rem] min-w-0 flex-col self-start rounded-lg border border-boutique-line bg-white p-5 lg:flex" aria-label="Работилници през месеца">
        <div className="mb-4 shrink-0 border-b border-boutique-line pb-3"><h3 className="font-heading text-xl text-boutique-ink">Работилници през месеца</h3><p className="mt-1 text-xs text-boutique-muted first-letter:uppercase" aria-live="polite">{calendarDateLabel(month, true)} · {count === 1 ? "1 работилница" : `${count} работилници`}</p></div>
        <div className="min-h-0 overflow-y-auto overscroll-contain pr-1 [scrollbar-gutter:stable] [scrollbar-width:thin]" role="region" aria-label="Списък с работилници за месеца" tabIndex={0}>
          {count ? <EventProgram events={monthEvents.slice(0, visibleCount)} now={now} showDate activeId={activeId} onEntryRef={(id, element) => { if (element) entryRefs.current.set(id, element); else entryRefs.current.delete(id); }} /> : <p className="py-4 text-sm leading-6 text-boutique-muted">Няма работилници през този месец.</p>}
        </div>
        {count > 5 ? <div className="mt-3 shrink-0 border-t border-boutique-line pt-3"><p className="text-xs text-boutique-muted" role="status">Показани {Math.min(visibleCount, count)} от {count}</p>{visibleCount < count ? <button type="button" onClick={() => setVisibleCount((previous) => previous + 5)} className="mt-2 inline-flex min-h-10 w-full items-center justify-center rounded-lg border border-boutique-sage-deep px-3 py-2 text-sm font-semibold text-boutique-sage-deep transition hover:bg-boutique-sage/10">Покажи още</button> : null}</div> : null}
      </aside>
    </div>

    <div className="mt-6 space-y-6 lg:hidden" aria-label="Програма за месеца">{count ? <h3 className="font-heading text-2xl text-boutique-ink">Работилници през месеца</h3> : null}{monthGroups.map(([day, items]) => <section key={day} className="scroll-mt-28 border-b border-boutique-line pb-5"><h3 className="mb-4 flex items-center gap-2 font-heading text-xl text-boutique-ink"><CalendarDays aria-hidden="true" className="h-5 w-5 shrink-0 text-boutique-sage-deep" /><span className="first-letter:uppercase">{calendarDateLabel(day)}</span></h3><EventProgram events={items} now={now} activeId={activeId} onEntryRef={(id, element) => { if (element) mobileEntryRefs.current.set(id, element); else mobileEntryRefs.current.delete(id); }} /></section>)}</div>

    {!count ? <div className="mt-5 border-y border-dashed border-boutique-line px-4 py-8 text-center"><p className="text-sm text-boutique-muted">Няма работилници през този месец.</p>{nextDay ? <button type="button" onClick={() => { changeMonth(nextDay.slice(0, 7)); setSelectedDay(nextDay); }} className="mt-3 inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-boutique-sage-deep hover:underline">Следваща работилница<ArrowRight aria-hidden="true" className="h-4 w-4" /></button> : null}</div> : null}
    {undated.length ? <section className="mt-8 border-t border-boutique-line pt-5"><h3 className="mb-4 font-heading text-xl text-boutique-ink">Датата предстои</h3><div className="max-w-lg"><EventProgram events={undated} now={now} /></div></section> : null}
  </div>;
}
