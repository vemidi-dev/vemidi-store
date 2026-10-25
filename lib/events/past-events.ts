export const PAST_EVENTS_PAGE_SIZE = 4;

export function isPastEventsOffset(value: number): boolean {
  return Number.isSafeInteger(value) && value >= 0 && value <= 10000 && value % PAST_EVENTS_PAGE_SIZE === 0;
}

export function comparePastEvents(
  a: { id: string; starts_at: string | null },
  b: { id: string; starts_at: string | null },
): number {
  const dateOrder = new Date(b.starts_at ?? 0).getTime() - new Date(a.starts_at ?? 0).getTime();
  return dateOrder || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
}
