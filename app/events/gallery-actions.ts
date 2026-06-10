"use server";

import {
  EVENT_GALLERY_PAGE_SIZE,
  getPublishedEventGalleryImages,
} from "@/lib/content/event-gallery";

export async function loadMoreEventGalleryImages(offset: number) {
  const images = await getPublishedEventGalleryImages(EVENT_GALLERY_PAGE_SIZE, offset);
  return images;
}
