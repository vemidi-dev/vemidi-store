export const IMAGE_BUCKET = "product-images";

export const IMAGE_CACHE_CONTROL = "public, max-age=31536000, immutable";

export const IMAGE_PROCESSING_CONCURRENCY = 2;

export const IMAGE_ACCEPTED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

/** Fixed scope for site-wide hero/hub images managed in admin. */
export const SITE_MEDIA_SCOPE_ID = "site-media";

/** Fixed scope for the flat public events gallery (no per-event rows). */
export const EVENT_GALLERY_SCOPE_ID = "gallery";

export const PUBLIC_EVENT_GALLERY_PAGE_SIZE = 12;

export const ADMIN_EVENT_GALLERY_PAGE_SIZE = 12;
