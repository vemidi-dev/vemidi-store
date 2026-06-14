import type { EventRow } from "@/lib/admin/types";
import { buildAbsoluteUrl } from "@/lib/seo/breadcrumbs";

const FORMAT_ONLINE = "\u043E\u043D\u043B\u0430\u0439\u043D";
const FORMAT_IN_PERSON = "\u043D\u0430 \u043C\u044F\u0441\u0442\u043E";
const FORMAT_HYBRID = "\u0445\u0438\u0431\u0440\u0438\u0434";

type EventFormatKind = "online" | "offline" | "hybrid";

type EventLocation =
  | Record<string, unknown>
  | Record<string, unknown>[];

function toAbsoluteImageUrl(imageUrl: string | null, siteUrl: URL): string | undefined {
  if (!imageUrl?.trim()) {
    return undefined;
  }

  try {
    return new URL(imageUrl, siteUrl).toString();
  } catch {
    return undefined;
  }
}

function resolveEndDate(event: EventRow): string | undefined {
  if (event.ends_at) {
    return event.ends_at;
  }

  if (!event.starts_at || !event.duration_minutes) {
    return undefined;
  }

  const end = new Date(event.starts_at);
  end.setMinutes(end.getMinutes() + event.duration_minutes);
  return end.toISOString();
}

export function normalizeEventFormat(format: string | null): EventFormatKind | null {
  if (!format?.trim()) {
    return null;
  }

  const normalized = format.trim().toLowerCase();

  if (
    normalized === "online" ||
    normalized.includes("online") ||
    normalized.includes(FORMAT_ONLINE)
  ) {
    return "online";
  }

  if (
    normalized === "hybrid" ||
    normalized === "mixed" ||
    normalized.includes("mixed") ||
    normalized.includes(FORMAT_HYBRID)
  ) {
    return "hybrid";
  }

  if (
    normalized === "in_person" ||
    normalized === "offline" ||
    normalized.includes("offline") ||
    normalized.includes("in_person") ||
    normalized.includes(FORMAT_IN_PERSON)
  ) {
    return "offline";
  }

  return null;
}

function buildPhysicalLocation(event: EventRow): Record<string, unknown> | undefined {
  const name = event.location?.trim();
  const address = event.address?.trim();

  if (!name && !address) {
    return undefined;
  }

  if (address) {
    return {
      "@type": "Place",
      ...(name ? { name } : {}),
      address: {
        "@type": "PostalAddress",
        streetAddress: address,
      },
    };
  }

  return {
    "@type": "Place",
    name,
  };
}

function buildVirtualLocation(registrationUrl: string | null): Record<string, unknown> | undefined {
  const url = registrationUrl?.trim();
  if (!url) {
    return undefined;
  }

  try {
    return {
      "@type": "VirtualLocation",
      url: new URL(url).toString(),
    };
  } catch {
    return undefined;
  }
}

export function buildEventLocation(
  event: EventRow,
  formatKind: EventFormatKind | null,
): EventLocation | undefined {
  const physical = buildPhysicalLocation(event);
  const virtual =
    formatKind === "online" || formatKind === "hybrid"
      ? buildVirtualLocation(event.registration_url)
      : undefined;

  if (formatKind === "online") {
    return virtual;
  }

  if (formatKind === "hybrid") {
    if (physical && virtual) {
      return [physical, virtual];
    }

    return physical ?? virtual;
  }

  return physical;
}

export function hasEventStarted(
  event: Pick<EventRow, "starts_at">,
  referenceDate: Date,
): boolean {
  if (!event.starts_at) {
    return false;
  }

  const startsAt = new Date(event.starts_at).getTime();
  return !Number.isNaN(startsAt) && startsAt <= referenceDate.getTime();
}

export function isEventEnded(event: EventRow, referenceDate: Date): boolean {
  const endDate = resolveEndDate(event);
  if (!endDate) {
    return false;
  }

  const endsAt = new Date(endDate).getTime();
  return !Number.isNaN(endsAt) && endsAt < referenceDate.getTime();
}

export function isRegistrationOpen(event: EventRow, referenceDate: Date): boolean {
  if (hasEventStarted(event, referenceDate) || isEventEnded(event, referenceDate)) {
    return false;
  }

  if (event.registration_url?.trim()) {
    return true;
  }

  return event.available_spots !== null && event.available_spots > 0;
}

function buildOffers(
  event: EventRow,
  eventUrl: string,
  referenceDate: Date,
): Record<string, unknown> | undefined {
  if (event.price === null) {
    return undefined;
  }

  if (hasEventStarted(event, referenceDate) || isEventEnded(event, referenceDate)) {
    return undefined;
  }

  if (event.available_spots !== null && event.available_spots <= 0) {
    return {
      "@type": "Offer",
      price: event.price.toFixed(2),
      priceCurrency: "EUR",
      url: eventUrl,
      availability: "https://schema.org/SoldOut",
    };
  }

  if (!isRegistrationOpen(event, referenceDate)) {
    return undefined;
  }

  return {
    "@type": "Offer",
    price: event.price.toFixed(2),
    priceCurrency: "EUR",
    url: eventUrl,
    availability: "https://schema.org/InStock",
  };
}

function buildOrganizer(event: EventRow): Record<string, unknown> | undefined {
  const hostName = event.host_name?.trim();
  if (!hostName) {
    return undefined;
  }

  return {
    "@type": "Person",
    name: hostName,
  };
}

function resolveAttendanceMode(formatKind: EventFormatKind | null): string | undefined {
  switch (formatKind) {
    case "online":
      return "https://schema.org/OnlineEventAttendanceMode";
    case "offline":
      return "https://schema.org/OfflineEventAttendanceMode";
    case "hybrid":
      return "https://schema.org/MixedEventAttendanceMode";
    default:
      return undefined;
  }
}

export function buildEventSchema(
  event: EventRow,
  siteUrl: URL,
  referenceDate: Date = new Date(),
): Record<string, unknown> | null {
  if (!event.starts_at?.trim()) {
    return null;
  }

  const formatKind = normalizeEventFormat(event.format);
  const location = buildEventLocation(event, formatKind);
  if (!location) {
    return null;
  }

  const url = buildAbsoluteUrl(`/events/${event.slug}`, siteUrl);
  const image = toAbsoluteImageUrl(event.image_url, siteUrl);
  const offers = buildOffers(event, url, referenceDate);
  const organizer = buildOrganizer(event);
  const eventAttendanceMode = resolveAttendanceMode(formatKind);
  const endDate = resolveEndDate(event);

  return {
    "@context": "https://schema.org",
    "@type": "Event",
    name: event.title,
    description: event.excerpt,
    ...(image ? { image: [image] } : {}),
    startDate: event.starts_at,
    ...(endDate ? { endDate } : {}),
    location,
    ...(offers ? { offers } : {}),
    ...(organizer ? { organizer } : {}),
    ...(eventAttendanceMode ? { eventAttendanceMode } : {}),
    url,
  };
}
