import { getSiteUrl } from "@/lib/site-url";

export function isEventFacebookUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return value.length <= 2048 && url.protocol === "https:" && !url.username && !url.password && !url.port &&
      ["facebook.com", "www.facebook.com", "m.facebook.com", "web.facebook.com", "fb.me"].includes(url.hostname);
  } catch { return false; }
}

export function eventShareUrl(slug: string): string {
  return new URL(`/sabitiya/${encodeURIComponent(slug)}`, getSiteUrl()).href;
}

export function eventFacebookUrl(settings: unknown): string | undefined {
  if (!settings || typeof settings !== "object") return undefined;
  const value = (settings as Record<string, unknown>).facebookEventUrl;
  return typeof value === "string" && isEventFacebookUrl(value) ? value : undefined;
}
