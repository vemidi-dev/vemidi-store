import type { EventRow } from "@/lib/admin/types";

export type EventPublishFilter = "all" | "published" | "draft";
export type EventPeriodFilter = "all" | "upcoming" | "active" | "ended" | "no-date";
export type EventSortKey = "starts-desc" | "starts-asc" | "title-asc" | "title-desc";

export type EventLifecycleStatus =
  | "draft"
  | "upcoming"
  | "active"
  | "ended"
  | "no-date";

export function getEventLifecycleStatus(
  event: Pick<EventRow, "is_published" | "starts_at" | "ends_at">,
  now: Date = new Date(),
): EventLifecycleStatus {
  if (!event.is_published) {
    return "draft";
  }

  const startsAt = event.starts_at ? new Date(event.starts_at) : null;
  const endsAt = event.ends_at ? new Date(event.ends_at) : null;

  if (!startsAt || Number.isNaN(startsAt.getTime())) {
    return "no-date";
  }

  const nowTime = now.getTime();
  const startTime = startsAt.getTime();
  const endTime =
    endsAt && !Number.isNaN(endsAt.getTime()) ? endsAt.getTime() : null;

  if (startTime > nowTime) {
    return "upcoming";
  }

  if (endTime != null && endTime < nowTime) {
    return "ended";
  }

  return "active";
}

export function formatEventLifecycleStatus(status: EventLifecycleStatus): string {
  switch (status) {
    case "draft":
      return "Чернова";
    case "upcoming":
      return "Предстои";
    case "active":
      return "Активно";
    case "ended":
      return "Приключило";
    case "no-date":
      return "Без дата";
  }
}

export function formatEventPeriod(
  startsAt: string | null,
  endsAt: string | null,
): string {
  if (!startsAt) {
    return "Без период";
  }

  const formatter = new Intl.DateTimeFormat("bg-BG", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Europe/Sofia",
  });

  const start = new Date(startsAt);
  if (Number.isNaN(start.getTime())) {
    return "Без период";
  }

  if (!endsAt) {
    return formatter.format(start);
  }

  const end = new Date(endsAt);
  if (Number.isNaN(end.getTime())) {
    return formatter.format(start);
  }

  const dateFormatter = new Intl.DateTimeFormat("bg-BG", {
    dateStyle: "medium",
    timeZone: "Europe/Sofia",
  });
  const timeFormatter = new Intl.DateTimeFormat("bg-BG", {
    timeStyle: "short",
    timeZone: "Europe/Sofia",
  });

  if (dateFormatter.format(start) === dateFormatter.format(end)) {
    return `${dateFormatter.format(start)}, ${timeFormatter.format(start)} – ${timeFormatter.format(end)}`;
  }

  return `${formatter.format(start)} – ${formatter.format(end)}`;
}

export function eventHasCoverImage(event: Pick<EventRow, "image_url">): boolean {
  return Boolean(event.image_url?.trim());
}

export function filterEvents(
  events: EventRow[],
  {
    search,
    publish,
    period,
  }: {
    search: string;
    publish: EventPublishFilter;
    period: EventPeriodFilter;
  },
  now: Date = new Date(),
): EventRow[] {
  const normalizedSearch = search.trim().toLocaleLowerCase("bg");

  return events.filter((event) => {
    if (
      normalizedSearch &&
      !event.title.toLocaleLowerCase("bg").includes(normalizedSearch) &&
      !event.slug.toLocaleLowerCase("bg").includes(normalizedSearch)
    ) {
      return false;
    }

    if (publish === "published" && !event.is_published) {
      return false;
    }
    if (publish === "draft" && event.is_published) {
      return false;
    }

    if (period !== "all") {
      const lifecycle = getEventLifecycleStatus(event, now);
      if (period === "no-date" && lifecycle !== "no-date") {
        return false;
      }
      if (period !== "no-date" && lifecycle !== period) {
        return false;
      }
    }

    return true;
  });
}

export function sortEvents(events: EventRow[], sortKey: EventSortKey): EventRow[] {
  const sorted = [...events];

  sorted.sort((left, right) => {
    if (sortKey === "title-asc") {
      return left.title.localeCompare(right.title, "bg");
    }
    if (sortKey === "title-desc") {
      return right.title.localeCompare(left.title, "bg");
    }

    const leftTime = left.starts_at ? new Date(left.starts_at).getTime() : 0;
    const rightTime = right.starts_at ? new Date(right.starts_at).getTime() : 0;

    if (sortKey === "starts-asc") {
      return leftTime - rightTime;
    }

    return rightTime - leftTime;
  });

  return sorted;
}
