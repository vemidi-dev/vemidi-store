export function isAllowedEventMapsUrl(value: string): boolean {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password) return false;
    if (url.hostname === "maps.app.goo.gl") return url.pathname.length > 1;
    if (url.hostname === "goo.gl") return url.pathname.startsWith("/maps/");
    if (["maps.google.com", "maps.google.bg"].includes(url.hostname)) return true;
    return ["google.com", "www.google.com", "google.bg", "www.google.bg"].includes(url.hostname) && /^\/maps(?:\/|$)/.test(url.pathname);
  } catch { return false; }
}

export function getEventMapLink(event: { maps_url?: string | null; address: string | null; location: string | null }) {
  const exact = event.maps_url?.trim();
  if (exact && isAllowedEventMapsUrl(exact)) return exact;
  const query = event.address?.trim() || event.location?.trim();
  return query ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}` : null;
}

export function getEventMapMigrationError(message: string) {
  return message.includes("maps_url") ? "За точния линк към картата първо изпълнете supabase/event_maps_url.sql в Supabase. Попълненото е запазено във формата." : null;
}
