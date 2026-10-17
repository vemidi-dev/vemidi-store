import Link from "next/link";
import type { ReactNode } from "react";
import { CalendarDays, LayoutGrid } from "lucide-react";
import { EventCalendar } from "@/components/content/event-calendar";
import { PageContainer } from "@/components/layout/page-container";
import type { CalendarEvent } from "@/lib/events/calendar";

export function EventsSchedule({ events, view, now, children }: { events: CalendarEvent[]; view: "cards" | "calendar"; now: number; children: ReactNode }) {
  return <section id="programa" className="scroll-mt-28 border-b border-boutique-line bg-boutique-blush/25 py-10 md:py-14">
    <PageContainer className="2xl:max-w-[1440px]">
      <div className="mb-7 flex flex-wrap items-center justify-between gap-5">
        <h2 className="font-heading text-3xl text-boutique-ink md:text-4xl">{view === "calendar" ? "Календар на работилниците" : "Предстоящи събития"}</h2>
        <nav aria-label="Изглед на събитията" className="inline-flex max-w-full shrink-0 rounded-lg border-2 border-boutique-sage-deep/60 bg-white p-1.5 shadow-sm">{([{ value: "cards", label: "Карти", icon: LayoutGrid }, { value: "calendar", label: "Календар", icon: CalendarDays }] as const).map(({ value, label, icon: Icon }) => <Link key={value} href={`/sabitiya${value === "calendar" ? "?view=calendar" : ""}#programa`} scroll={false} aria-current={view === value ? "page" : undefined} className={`inline-flex h-12 items-center gap-2 rounded-md px-4 text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 sm:px-5 ${view === value ? "bg-boutique-sage-deep text-white shadow-sm" : "text-boutique-ink hover:bg-boutique-sage/15"}`}><Icon aria-hidden="true" className="h-5 w-5" />{label}</Link>)}</nav>
      </div>
      {view === "calendar" ? <EventCalendar events={events} now={now} /> : children}
    </PageContainer>
  </section>;
}
