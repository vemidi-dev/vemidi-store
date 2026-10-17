import { addMonths, eachDayOfInterval, endOfMonth, endOfWeek, format, isValid, parseISO, startOfMonth, startOfWeek } from "date-fns";
import type { EventRow } from "@/lib/admin/types";
import { formatEventPrice } from "@/lib/events/pricing";

export type CalendarEvent = Pick<EventRow, "id" | "title" | "slug" | "image_url" | "starts_at" | "ends_at" | "age_group" | "available_spots" | "duration_minutes"> & { priceLabel: string | null };

const sofiaDay = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Sofia", year: "numeric", month: "2-digit", day: "2-digit" });
const sofiaTime = new Intl.DateTimeFormat("bg-BG", { timeZone: "Europe/Sofia", hour: "2-digit", minute: "2-digit" });

export function eventDateKey(value: string | number): string | null {
  const date = new Date(value);
  if (!isValid(date)) return null;
  const parts = sofiaDay.formatToParts(date);
  const part = (type: string) => parts.find((item) => item.type === type)?.value;
  return `${part("year")}-${part("month")}-${part("day")}`;
}

export function isCalendarMonth(value: string): boolean {
  return /^(19\d{2}|20\d{2}|2100)-(0[1-9]|1[0-2])$/.test(value);
}

export function calendarDays(month: string): string[] {
  if (!isCalendarMonth(month)) return [];
  // Civil dates use date-fns; event timestamps are separately grouped in Sofia time.
  const start = startOfWeek(startOfMonth(parseISO(`${month}-01`)), { weekStartsOn: 1 });
  const end = endOfWeek(endOfMonth(parseISO(`${month}-01`)), { weekStartsOn: 1 });
  return eachDayOfInterval({ start, end }).map((day) => format(day, "yyyy-MM-dd"));
}

export function shiftCalendarMonth(month: string, direction: number): string {
  if (!isCalendarMonth(month)) return month;
  const next = format(addMonths(parseISO(`${month}-01`), direction), "yyyy-MM");
  return isCalendarMonth(next) ? next : month;
}

export function calendarMonthOptions(month: string): string[] {
  if (!isCalendarMonth(month)) return [];
  const date = parseISO(`${month}-01`);
  return Array.from({ length: 7 }, (_, index) => format(addMonths(date, index - 3), "yyyy-MM")).filter(isCalendarMonth);
}

export function calendarDateLabel(day: string, monthOnly = false): string {
  return new Intl.DateTimeFormat("bg-BG", monthOnly
    ? { month: "long", year: "numeric" }
    : { weekday: "long", day: "numeric", month: "long" }).format(parseISO(monthOnly ? `${day}-01` : day));
}

export function toCalendarEvent(event: EventRow): CalendarEvent {
  return { id: event.id, title: event.title, slug: event.slug, image_url: event.image_url, starts_at: event.starts_at, ends_at: event.ends_at, age_group: event.age_group, available_spots: event.available_spots, duration_minutes: event.duration_minutes, priceLabel: formatEventPrice(event) };
}

export function groupCalendarEvents(events: CalendarEvent[]): Map<string, CalendarEvent[]> {
  const groups = new Map<string, CalendarEvent[]>();
  for (const event of [...events].sort((a, b) => new Date(a.starts_at ?? 0).getTime() - new Date(b.starts_at ?? 0).getTime() || a.id.localeCompare(b.id))) {
    const day = event.starts_at ? eventDateKey(event.starts_at) : null;
    if (day) groups.set(day, [...(groups.get(day) ?? []), event]);
  }
  return groups;
}

export function calendarEventStatus(event: CalendarEvent, now: number): "past" | "full" | "upcoming" {
  const start = event.starts_at ? new Date(event.starts_at).getTime() : NaN;
  const end = event.ends_at ? new Date(event.ends_at).getTime() : start + (event.duration_minutes ?? 0) * 60000;
  if (Number.isFinite(end) && end < now) return "past";
  return event.available_spots === 0 ? "full" : "upcoming";
}

export function calendarEventTime(event: CalendarEvent): string {
  if (!event.starts_at || !isValid(new Date(event.starts_at))) return "Часът предстои";
  const start = new Date(event.starts_at);
  const end = event.ends_at ? new Date(event.ends_at) : event.duration_minutes ? new Date(start.getTime() + event.duration_minutes * 60000) : null;
  return `${sofiaTime.format(start)}${end && isValid(end) ? `–${sofiaTime.format(end)}` : ""}`;
}
