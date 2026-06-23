import { siteMediaDefaults } from "@/lib/content/site-media-defaults";
import {
  SITE_MEDIA_KEYS,
  type ResolvedSiteMedia,
  type SiteMediaKey,
  type SiteMediaRow,
} from "@/lib/content/site-media-types";
import { createClient } from "@/lib/supabase/server";

function isSiteMediaKey(key: string): key is SiteMediaKey {
  return (SITE_MEDIA_KEYS as readonly string[]).includes(key);
}

function normalizeSiteMediaRow(row: {
  key: string;
  label: string;
  section: string;
  sort_order: number;
  image_url: string | null;
  image_alt: string | null;
  updated_at: string;
}): SiteMediaRow | null {
  if (!isSiteMediaKey(row.key)) {
    return null;
  }

  return {
    key: row.key,
    label: row.label,
    section: row.section,
    sort_order: row.sort_order,
    image_url: row.image_url,
    image_alt: row.image_alt,
    updated_at: row.updated_at,
  };
}

export async function getSiteMedia(): Promise<SiteMediaRow[]> {
  const supabase = await createClient();
  if (!supabase) {
    return [];
  }

  const { data, error } = await supabase
    .from("site_media")
    .select(
      "key,label,section,sort_order,image_url,image_alt,updated_at",
    )
    .order("section")
    .order("sort_order")
    .order("key");

  if (error) {
    return [];
  }

  return (data ?? [])
    .map((row) => normalizeSiteMediaRow(row))
    .filter((row): row is SiteMediaRow => row !== null);
}

export async function getSiteMediaMap(): Promise<
  Record<SiteMediaKey, SiteMediaRow | null>
> {
  const rows = await getSiteMedia();
  const map = Object.fromEntries(
    SITE_MEDIA_KEYS.map((key) => [key, null]),
  ) as Record<SiteMediaKey, SiteMediaRow | null>;

  for (const row of rows) {
    map[row.key] = row;
  }

  return map;
}

export function resolveSiteMedia(
  key: SiteMediaKey,
  row?: SiteMediaRow | null,
): ResolvedSiteMedia {
  const defaults = siteMediaDefaults[key];
  const uploadedUrl = row?.image_url?.trim();

  if (uploadedUrl) {
    const alt = row?.image_alt?.trim() || defaults.alt;
    return {
      src: uploadedUrl,
      alt,
      source: "uploaded",
    };
  }

  return {
    src: defaults.src,
    alt: defaults.alt,
    source: "fallback",
  };
}

export function resolveSiteMediaFromMap(
  map: Record<SiteMediaKey, SiteMediaRow | null>,
  key: SiteMediaKey,
): ResolvedSiteMedia {
  return resolveSiteMedia(key, map[key]);
}
