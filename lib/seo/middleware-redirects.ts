import type { NextRequest } from "next/server";

import {
  getLegacyProductCategoryRedirect,
  normalizeProductCategoryQueryParams,
  resolveCanonicalProductCategorySlug,
} from "@/lib/category-slug-aliases";
import {
  CATEGORY_INDEX_PATH,
  OCCASION_INDEX_PATH,
  getCategoryPath,
  getOccasionPath,
} from "@/lib/category-url";
import { getProductPath } from "@/lib/product-url";

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
  return { pathname: getCategoryPath(slug) };
}

function occasionPath(slug: string): RedirectTarget {
  return { pathname: getOccasionPath(slug) };
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
  if (pathname === "/categories") {
    return redirectWithSearch(CATEGORY_INDEX_PATH, searchParams);
  }

  const legacyMatch = pathname.match(/^\/categories\/([^/]+)$/);
  if (legacyMatch) {
    const slug = legacyMatch[1]!;
    if (!isValidRedirectSlug(slug)) {
      return null;
    }

    const canonicalSlug = getLegacyProductCategoryRedirect(slug) ?? slug;
    const normalizedSearch = normalizeProductCategoryQueryParams(searchParams);
    return redirectWithSearch(getCategoryPath(canonicalSlug), normalizedSearch ?? searchParams);
  }

  const match = pathname.match(/^\/categorii\/([^/]+)$/);
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
    return redirectWithSearch(getCategoryPath(canonicalSlug), nextSearch);
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
  if (pathname === "/occasions") {
    return redirectWithSearch(OCCASION_INDEX_PATH, searchParams);
  }

  const legacyMatch = pathname.match(/^\/occasions\/([^/]+)$/);
  if (legacyMatch) {
    const slug = legacyMatch[1]!;
    if (!isValidRedirectSlug(slug)) {
      return null;
    }

    const normalizedSearch = normalizeProductCategoryQueryParams(searchParams);
    return redirectWithSearch(getOccasionPath(slug), normalizedSearch ?? searchParams);
  }

  const match = pathname.match(/^\/povodi\/([^/]+)$/);
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
  if (pathname === "/about") {
    return redirectWithSearch("/za-nas", searchParams);
  }

  if (pathname === "/contact") {
    return redirectWithSearch("/kontakti", searchParams);
  }

  if (pathname === "/events") {
    return redirectWithSearch("/sabitiya", searchParams);
  }

  const legacyEventPathMatch = pathname.match(/^\/events\/([^/]+)$/);
  if (legacyEventPathMatch) {
    const slug = legacyEventPathMatch[1]!;
    if (!isValidRedirectSlug(slug)) {
      return null;
    }

    return redirectWithSearch(`/sabitiya/${slug}`, searchParams);
  }

  const legacyProductPathMatch = pathname.match(/^\/products\/([^/]+)$/);
  if (legacyProductPathMatch) {
    const slug = legacyProductPathMatch[1]!;
    if (!isValidRedirectSlug(slug)) {
      return null;
    }

    return redirectWithSearch(getProductPath(slug), searchParams);
  }

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
        return { pathname: "/producti" };
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
        return redirectWithSearch("/producti", normalizedSearch);
      }

      return redirectWithSearch("/producti", searchParams);
    }

    if (single.key === "product") {
      return categoryPath(resolveCanonicalProductCategorySlug(single.value));
    }

    if (single.key === "occasion") {
      return occasionPath(single.value);
    }

    return redirectWithSearch("/producti", searchParams);
  }

  if (pathname === "/producti") {
    const single = singleQueryParam(searchParams);
    if (single) {
      if (single.key === "product") {
        return categoryPath(resolveCanonicalProductCategorySlug(single.value));
      }

      if (single.key === "occasion") {
        return occasionPath(single.value);
      }

      return null;
    }

    const normalizedSearch = normalizeProductCategoryQueryParams(searchParams);
    if (normalizedSearch) {
      return redirectWithSearch(pathname, normalizedSearch);
    }
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
