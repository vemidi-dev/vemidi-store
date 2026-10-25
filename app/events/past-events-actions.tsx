"use server";

import { EventCard } from "@/components/content/event-card";
import type { EventRow } from "@/lib/admin/types";
import { isPastEventsOffset, PAST_EVENTS_PAGE_SIZE } from "@/lib/events/past-events";
import { createClient } from "@/lib/supabase/server";

export async function loadMorePastEvents(offset: number, before: number) {
  if (!isPastEventsOffset(offset) || !Number.isFinite(before) || before <= 0 || before > Date.now()) {
    throw new Error("Невалидна страница.");
  }
  const cutoff = new Date(before).toISOString();
  const supabase = await createClient();
  if (!supabase) throw new Error("Събитията не са достъпни в момента.");
  const { data, count, error } = await supabase
    .from("events")
    .select("*", { count: "exact" })
    .eq("is_published", true)
    .or(`ends_at.lt.${cutoff},and(ends_at.is.null,starts_at.lt.${cutoff})`)
    .order("starts_at", { ascending: false, nullsFirst: false })
    .order("id", { ascending: true })
    .range(offset, offset + PAST_EVENTS_PAGE_SIZE - 1);
  if (error) throw new Error("Събитията не могат да се заредят в момента.");
  return {
    cards: ((data ?? []) as EventRow[]).map((event) => ({
      id: event.id,
      content: <EventCard event={event} past />,
    })),
    totalCount: count ?? 0,
  };
}
