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

/** Fixed UUID scope for reusable product material texture library. */
export const PRODUCT_MATERIALS_SCOPE_ID = "11111111-1111-4111-8111-111111111111";

/** Fixed UUID scope for blog inline images before a post id exists. */
export const BLOG_INLINE_SCOPE_ID = "22222222-2222-4222-8222-222222222222";

/** Fixed scope for the flat public events gallery (no per-event rows). */
export const EVENT_GALLERY_SCOPE_ID = "gallery";

export const PUBLIC_EVENT_GALLERY_PAGE_SIZE = 12;

export const ADMIN_EVENT_GALLERY_PAGE_SIZE = 12;
