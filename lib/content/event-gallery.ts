import { createClient } from "@/lib/supabase/server";

import { PUBLIC_EVENT_GALLERY_PAGE_SIZE } from "@/lib/images/constants";

export const EVENT_GALLERY_PAGE_SIZE = PUBLIC_EVENT_GALLERY_PAGE_SIZE;

export type EventGalleryImage = {
  id: string;
  imageUrl: string;
  altText: string;
};

type EventGalleryImageRow = {
  id: string;
  image_url: string;
  alt_text: string | null;
  sort_order: number;
};

function toEventGalleryImage(row: EventGalleryImageRow): EventGalleryImage {
  return {
    id: row.id,
    imageUrl: row.image_url,
    altText: row.alt_text?.trim() || "Снимка от творческа работилница",
  };
}

export async function getPublishedEventGalleryImages(
  limit = EVENT_GALLERY_PAGE_SIZE,
  offset = 0,
): Promise<EventGalleryImage[]> {
  const supabase = await createClient();
  if (!supabase) {
    return [];
  }

  const { data, error } = await supabase
    .from("event_gallery_images")
    .select("id,image_url,alt_text,sort_order")
    .eq("is_published", true)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true })
    .range(offset, offset + limit - 1);

  if (error) {
    return [];
  }

  return ((data ?? []) as EventGalleryImageRow[]).map(toEventGalleryImage);
}

export async function countPublishedEventGalleryImages(): Promise<number> {
  const supabase = await createClient();
  if (!supabase) {
    return 0;
  }

  const { count, error } = await supabase
    .from("event_gallery_images")
    .select("id", { count: "exact", head: true })
    .eq("is_published", true);

  return error ? 0 : count ?? 0;
}
