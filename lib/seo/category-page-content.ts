import type { Metadata } from "next";

import {
  normalizeSeoPlainText,
  truncateSeoDescription,
} from "@/lib/seo/seo-text";
import type { StorefrontCategory } from "@/lib/storefront/types";

function trimVisibleText(value: string | null | undefined): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed || null;
}

export function resolveCategoryHeroDescription(
  category: StorefrontCategory,
  fallback: string,
): string {
  return (
    trimVisibleText(category.hero_description) ??
    trimVisibleText(category.card_description) ??
    fallback
  );
}

export function resolveCategoryListingHeading(
  category: StorefrontCategory,
): string {
  return trimVisibleText(category.listing_heading) ?? category.name;
}

export function resolveCategoryIntroText(
  category: StorefrontCategory,
): string | null {
  return trimVisibleText(category.intro_text);
}

export function resolveCategorySeoBody(
  category: StorefrontCategory,
): string | null {
  return trimVisibleText(category.seo_body);
}

export function resolveCategoryMetaTitle(
  category: StorefrontCategory,
): string {
  return trimVisibleText(category.meta_title) ?? category.name;
}

export function buildCategoryRecordMetaDescription(
  category: StorefrontCategory,
  legacyFallback: string,
): string {
  const fromAdmin = normalizeSeoPlainText(category.meta_description);
  if (fromAdmin) {
    return truncateSeoDescription(fromAdmin) || fromAdmin;
  }

  const fromCard = normalizeSeoPlainText(category.card_description);
  const base = fromCard || legacyFallback;
  return truncateSeoDescription(base) || base;
}

export function resolveCategoryOgTitle(
  category: StorefrontCategory,
  metaTitle: string,
): string {
  return trimVisibleText(category.og_title) ?? metaTitle;
}

export function resolveCategoryOgDescription(
  category: StorefrontCategory,
  metaDescription: string,
): string {
  const fromAdmin = normalizeSeoPlainText(category.og_description);
  return fromAdmin || metaDescription;
}

export function resolveCategoryPageRobots(input: {
  faceted: boolean;
  indexable: boolean;
  robotsIndex: boolean | null | undefined;
}): Metadata["robots"] {
  if (input.faceted) {
    return { index: false, follow: true };
  }

  if (input.robotsIndex === true) {
    return { index: true, follow: true };
  }

  if (input.robotsIndex === false) {
    return { index: false, follow: true };
  }

  return input.indexable
    ? { index: true, follow: true }
    : { index: false, follow: true };
}
