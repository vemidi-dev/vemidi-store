const FALLBACK_SITE_URL = "https://vemidi-crafts.com";

export function getSiteUrl() {
  const configuredUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();

  try {
    return new URL(configuredUrl || FALLBACK_SITE_URL);
  } catch {
    return new URL(FALLBACK_SITE_URL);
  }
}
