import type { Metadata } from "next";

import {
  buildFacetedNoindexMetadata,
  buildIndexableMetadata,
} from "@/lib/seo/faceted-metadata";
import { firstSearchParam } from "@/lib/seo/shop-route";

export const BLOG_KNOWN_PARAMS = new Set(["q", "category", "sort"]);

const BLOG_METADATA_BASE = {
  title: "Блог",
  description:
    "Идеи за подаръци, детско творчество, полезни съвети и истории от ателието на VeMiDi.",
} as const;

export type ParsedBlogParams = {
  q: string;
  category: string;
  sort: string;
  unknownParams: string[];
};

export function parseBlogSearchParams(
  params: Record<string, string | string[] | undefined>,
): ParsedBlogParams {
  return {
    q: firstSearchParam(params.q),
    category: firstSearchParam(params.category),
    sort: firstSearchParam(params.sort),
    unknownParams: Object.keys(params).filter(
      (key) => !BLOG_KNOWN_PARAMS.has(key),
    ),
  };
}

export function isBlogFaceted(
  params: Record<string, string | string[] | undefined>,
): boolean {
  return Object.keys(params).length > 0;
}

export function buildBlogMetadata(
  params: Record<string, string | string[] | undefined>,
): Metadata {
  if (isBlogFaceted(params)) {
    return buildFacetedNoindexMetadata("/blog", BLOG_METADATA_BASE);
  }

  return buildIndexableMetadata("/blog", BLOG_METADATA_BASE);
}
