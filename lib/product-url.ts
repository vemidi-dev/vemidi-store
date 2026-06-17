import type { Product } from "@/lib/catalog";

export const PRODUCT_INDEX_PATH = "/produkti";

export function getProductPath(slug: string) {
  return `${PRODUCT_INDEX_PATH}/${encodeURIComponent(slug)}`;
}

export function getProductUrl(product: Pick<Product, "slug">, siteUrl?: string) {
  const path = getProductPath(product.slug);
  if (!siteUrl) {
    return path;
  }
  return new URL(path, siteUrl).toString();
}

/** Allowed campaign query keys when redirecting legacy product URLs. */
export const PRODUCT_REDIRECT_QUERY_ALLOWLIST = new Set([
  "campaign",
  "source",
  "landing",
]);

export function buildProductRedirectSearchParams(
  searchParams: Record<string, string | string[] | undefined>,
) {
  const params = new URLSearchParams();

  for (const [key, rawValue] of Object.entries(searchParams)) {
    if (!PRODUCT_REDIRECT_QUERY_ALLOWLIST.has(key)) {
      continue;
    }

    const value = Array.isArray(rawValue) ? rawValue[0] : rawValue;
    if (typeof value !== "string" || !value.trim()) {
      continue;
    }

    if (key === "campaign") {
      params.set("campaign", value.trim().slice(0, 64));
      continue;
    }

    if (key === "source") {
      params.set("source", value.trim().slice(0, 120));
      continue;
    }

    if (key === "landing") {
      try {
        const url = new URL(value);
        if (url.protocol === "https:" || url.protocol === "http:") {
          params.set("landing", url.toString().slice(0, 500));
        }
      } catch {
        // Ignore invalid landing URLs to avoid open redirects.
      }
    }
  }

  return params;
}

export function buildCanonicalProductRedirectPath(
  targetSlug: string,
  searchParams?: Record<string, string | string[] | undefined>,
) {
  const params = searchParams
    ? buildProductRedirectSearchParams(searchParams)
    : new URLSearchParams();
  const query = params.toString();
  return `${getProductPath(targetSlug)}${query ? `?${query}` : ""}`;
}
