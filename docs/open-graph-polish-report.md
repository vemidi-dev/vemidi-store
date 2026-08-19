# Open Graph Social Previews — Polish Report

## What was already in place

- Root layout (`app/layout.tsx`) sets `openGraph.type`, `locale`, `siteName`, `title`, `description` and `twitter.card` defaults.
- Product detail pages had full OG + Twitter metadata with primary product image.
- Home and About pages used `site_media` hero images for OG + Twitter via `appendOpenGraphAndTwitterImages`.
- Info pages (kontakti, delivery, returns, terms, privacy, cookies) used `home.hero` as fallback social image.
- Category and occasion detail pages had OG + Twitter with hero/cover images but were missing `locale`, `siteName`, and `type`.
- Blog post pages had `openGraph` with `article` type but no Twitter metadata.
- Event detail pages had `openGraph` with `article` type but no Twitter metadata.
- Blog index, events index, and categories index had no `og:image`.
- Zagotovki (material categories) had OG title/description but no image and no Twitter metadata.

## What was changed

### Shared helpers

| File | Change |
|---|---|
| `lib/seo/social-images.ts` | Added `OG_DEFAULTS` constant (`locale: "bg_BG"`, `siteName`) |
| `lib/seo/category-metadata.ts` | Added `type: "website"`, `...OG_DEFAULTS`; OG image now includes `alt` |
| `lib/seo/occasion-metadata.ts` | Added `type: "website"`, `...OG_DEFAULTS`; OG image now includes `alt` |
| `lib/seo/info-page-metadata.ts` | Added `...OG_DEFAULTS` to OG block |
| `lib/seo/faceted-metadata.ts` | Added `...OG_DEFAULTS` to `buildIndexableMetadata` OG block |
| `lib/seo/blog-route.ts` | `buildBlogMetadata` now accepts optional `socialImage` param |

### Route pages

| File | Change |
|---|---|
| `app/blog/page.tsx` | `generateMetadata` fetches `blog.hero` and passes it to `buildBlogMetadata` |
| `app/blog/[slug]/page.tsx` | Added `locale`, `siteName` to OG; added full Twitter metadata |
| `app/events/page.tsx` | Converted static `metadata` to async `generateMetadata`; fetches `events.hero`; full OG + Twitter |
| `app/events/[slug]/page.tsx` | Added `locale`, `siteName` to OG; added full Twitter metadata |
| `app/categories/page.tsx` | Converted static `metadata` to async `generateMetadata`; fetches `categories.hero`; full OG + Twitter |
| `app/zagotovki-i-materiali/[slug]/page.tsx` | Added OG image from category hero; added `locale`, `siteName`; added full Twitter metadata |
| `app/categorii/page.tsx` | Updated re-export from `metadata` to `generateMetadata` |
| `app/sabitiya/page.tsx` | Updated re-export from `metadata` to `generateMetadata` |

### Tests

| File | Change |
|---|---|
| `tests/og-social-previews.test.ts` | **New** — 10 tests covering locale/siteName on category, occasion, info, faceted, blog; OG images with alt; product image + no-image fallback |
| `tests/seo-soft-404-routes.test.ts` | Updated to reflect async `generateMetadata` for categories hub |

## Routes covered

| Route | OG title | OG description | OG url | OG locale | OG siteName | OG image | Twitter card | Twitter image |
|---|---|---|---|---|---|---|---|---|
| Home `/` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ (home.hero) | ✅ | ✅ |
| Shop `/produkti` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ (shop.hero) | ✅ | ✅ |
| Product `/produkti/[slug]` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ (primary image) | ✅ | ✅ |
| Category `/categorii/[slug]` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ (hero, with alt) | ✅ | ✅ |
| Occasion `/povodi/[slug]` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ (hero, with alt) | ✅ | ✅ |
| Categories index `/categorii` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ (categories.hero) | ✅ | ✅ |
| Blog index `/blog` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ (blog.hero) | ✅ | ✅ |
| Blog post `/blog/[slug]` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ (post image) | ✅ | ✅ |
| Events index `/sabitiya` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ (events.hero) | ✅ | ✅ |
| Event detail `/sabitiya/[slug]` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ (event image) | ✅ | ✅ |
| Materials `/zagotovki-i-materiali/[slug]` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ (category hero) | ✅ | ✅ |
| About `/za-nas` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ (about.hero) | ✅ | ✅ |
| Info pages (6) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ (home.hero fallback) | ✅ | ✅ |

## Image fallback order

1. **Product** → primary product image
2. **Category / Occasion / Material** → category hero/cover image → static default from `category-image-resolution`
3. **Blog post** → `post.image_url`
4. **Event detail** → `event.image_url`
5. **Index pages** (blog, events, categories, shop) → `site_media` hero (e.g. `blog.hero`, `events.hero`)
6. **Info pages** → `home.hero` from `site_media`
7. **Home / About** → dedicated `site_media` keys (`home.hero`, `about.hero`)
8. All `site_media` keys resolve to a static fallback from `site-media-defaults.ts` when no upload exists.

## How to test with Facebook Sharing Debugger

1. Go to [Facebook Sharing Debugger](https://developers.facebook.com/tools/debug/)
2. Enter the URL of any page (e.g. `https://vemidi.com/produkti/some-product`)
3. Click **Debug** (or **Scrape Again** to refresh cached data)
4. Verify: `og:title`, `og:description`, `og:image`, `og:url`, `og:site_name`, `og:locale`
5. The preview should show a large image card with the product/category/blog photo

## Phase 2 (deferred)

- Dedicated "Social image" field per product/category/blog post in the admin panel (allows uploading a custom 1200×630 image optimized for social sharing).
- Fallback brand/social default image (`og-default.jpg`) — currently no safe generic brand asset exists in `public/`. A designer should create one.
- `og:image:width` and `og:image:height` for faster rendering (requires knowing image dimensions at metadata time).
- WhatsApp/Viber-specific link previews (currently rely on OG tags, which is sufficient).
