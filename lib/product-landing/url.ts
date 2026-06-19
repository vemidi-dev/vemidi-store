import { validateLandingSlug } from "@/lib/product-landing/validation";

export const FALLBACK_LANDING_BASE_URL = "https://special.vemidi-crafts.com";

const ALLOWED_LANDING_HOSTS = new Set([
  "special.vemidi-crafts.com",
  "localhost",
  "127.0.0.1",
]);

function sanitizeLandingBaseUrl(raw: string | null | undefined): URL {
  const candidate = raw?.trim() || FALLBACK_LANDING_BASE_URL;

  try {
    const url = new URL(candidate);

    if (url.protocol !== "https:" && url.protocol !== "http:") {
      return new URL(FALLBACK_LANDING_BASE_URL);
    }

    if (!ALLOWED_LANDING_HOSTS.has(url.hostname.toLowerCase())) {
      return new URL(FALLBACK_LANDING_BASE_URL);
    }

    if (url.username || url.password) {
      return new URL(FALLBACK_LANDING_BASE_URL);
    }

    url.pathname = "/";
    url.search = "";
    url.hash = "";
    return url;
  } catch {
    return new URL(FALLBACK_LANDING_BASE_URL);
  }
}

export function getLandingBaseUrl(configuredUrl?: string | null): URL {
  const fromEnv = configuredUrl ?? process.env.NEXT_PUBLIC_LANDING_BASE_URL;
  return sanitizeLandingBaseUrl(fromEnv);
}

export function buildProductLandingUrl(
  slug: string,
  baseUrl: URL = getLandingBaseUrl(),
): string | null {
  const validation = validateLandingSlug(slug);
  if (!validation.ok) {
    return null;
  }

  return new URL(validation.slug, baseUrl).toString();
}
