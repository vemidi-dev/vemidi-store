import type { NextRequest } from "next/server";

import {
  getLegacyProductCategoryRedirect,
  normalizeProductCategoryQueryParams,
  resolveCanonicalProductCategorySlug,
} from "@/lib/category-slug-aliases";

/** Permanent redirect status used for legacy SEO URL cleanup. */
export const SEO_REDIRECT_STATUS = 308;

/** Lowercase hyphenated slug used in category/occasion path segments. */
export const REDIRECT_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

type RedirectTarget = {
  pathname: string;
  search?: string;
};

export function isSeoRedirectSafeMethod(method: string): boolean {
  return method === "GET" || method === "HEAD";
}

export function isValidRedirectSlug(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed || trimmed !== value) {
    return false;
  }

  return REDIRECT_SLUG_PATTERN.test(trimmed);
}

function singleQueryParam(
  searchParams: URLSearchParams,
): { key: string; value: string } | null {
  const keys = [...searchParams.keys()];
  if (keys.length !== 1) {
    return null;
  }

  const key = keys[0]!;
  const value = searchParams.get(key) ?? "";
  if (!value || !isValidRedirectSlug(value)) {
    return null;
  }

  return { key, value };
}

function categoryPath(slug: string): RedirectTarget {
  return { pathname: `/categories/${slug}` };
}

function occasionPath(slug: string): RedirectTarget {
  return { pathname: `/occasions/${slug}` };
}

function redirectWithSearch(
  pathname: string,
  searchParams: URLSearchParams,
): RedirectTarget {
  const search = searchParams.toString();
  return search ? { pathname, search } : { pathname };
}

function resolveLegacyCategoryPathRedirect(
  pathname: string,
  searchParams: URLSearchParams,
): RedirectTarget | null {
  const match = pathname.match(/^\/categories\/([^/]+)$/);
  if (!match) {
    return null;
  }

  const slug = match[1]!;
  if (!isValidRedirectSlug(slug)) {
    return null;
  }

  const canonicalSlug = getLegacyProductCategoryRedirect(slug);
  const normalizedSearch = normalizeProductCategoryQueryParams(searchParams);
  const nextSearch = normalizedSearch ?? searchParams;

  if (canonicalSlug) {
    return redirectWithSearch(`/categories/${canonicalSlug}`, nextSearch);
  }

  if (normalizedSearch) {
    return redirectWithSearch(pathname, normalizedSearch);
  }

  return null;
}

function resolveContextFilterQueryRedirect(
  pathname: string,
  searchParams: URLSearchParams,
): RedirectTarget | null {
  const match = pathname.match(/^\/occasions\/([^/]+)$/);
  if (!match) {
    return null;
  }

  const slug = match[1]!;
  if (!isValidRedirectSlug(slug)) {
    return null;
  }

  const normalizedSearch = normalizeProductCategoryQueryParams(searchParams);
  if (!normalizedSearch) {
    return null;
  }

  return redirectWithSearch(pathname, normalizedSearch);
}

/**
 * Pure URL redirect resolver for SEO legacy paths.
 * No database access — category/occasion type for `category=` stays on RSC routes.
 */
export function resolveSeoRedirectTarget(
  pathname: string,
  searchParams: URLSearchParams,
): RedirectTarget | null {
  const legacyCategoryRedirect = resolveLegacyCategoryPathRedirect(
    pathname,
    searchParams,
  );
  if (legacyCategoryRedirect) {
    return legacyCategoryRedirect;
  }

  const contextFilterRedirect = resolveContextFilterQueryRedirect(
    pathname,
    searchParams,
  );
  if (contextFilterRedirect) {
    return contextFilterRedirect;
  }

  if (pathname === "/products") {
    const single = singleQueryParam(searchParams);
    if (!single) {
      const normalizedSearch = normalizeProductCategoryQueryParams(searchParams);
      if (normalizedSearch) {
        return redirectWithSearch(pathname, normalizedSearch);
      }

      if (searchParams.size === 0) {
        return { pathname: "/shop" };
      }
      return null;
    }

    if (single.key === "product") {
      return categoryPath(resolveCanonicalProductCategorySlug(single.value));
    }

    if (single.key === "occasion") {
      return occasionPath(single.value);
    }

    // `category=` may map to product or occasion — resolved in app route with catalog.
    return null;
  }

  if (pathname === "/shop") {
    const single = singleQueryParam(searchParams);
    if (!single) {
      const normalizedSearch = normalizeProductCategoryQueryParams(searchParams);
      if (normalizedSearch) {
        return redirectWithSearch(pathname, normalizedSearch);
      }

      return null;
    }

    if (single.key === "product") {
      return categoryPath(resolveCanonicalProductCategorySlug(single.value));
    }

    if (single.key === "occasion") {
      return occasionPath(single.value);
    }

    return null;
  }

  return null;
}

export function resolveSeoRedirectUrl(request: NextRequest): URL | null {
  if (!isSeoRedirectSafeMethod(request.method)) {
    return null;
  }

  const target = resolveSeoRedirectTarget(
    request.nextUrl.pathname,
    request.nextUrl.searchParams,
  );

  if (!target) {
    return null;
  }

  const url = request.nextUrl.clone();
  url.pathname = target.pathname;
  url.search = target.search ? `?${target.search}` : "";
  return url;
}
