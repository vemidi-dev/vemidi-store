# Home Page Performance

## Scope

- Home hero waits only for cached public copy and home media, not the catalog, all blog articles, events or FAQ. Lower catalog/category and editorial sections have independent Suspense boundaries.
- Initial product cards load eight products. The existing load-more button requests the next eight through a public, bounded, read-only endpoint; errors preserve existing cards and allow retry. Duplicate clicks are guarded and repeated IDs are deduplicated.
- Product ordering still combines published/public featured IDs with the existing catalog comparator. Only lightweight ordering metadata is read across the catalog; product details, images, promotions and option flags are limited to the selected page.
- Cards do not fetch or serialize long descriptions, category relations, SEO fields or unrelated product galleries. Only three published featured article summaries are fetched. Past-event client props no longer include full event descriptions/galleries.
- Shared 60-second cache uses a dedicated anonymous client with public RLS, never session cookies or a service-role key. Public cache tags are invalidated by relevant admin product/category/content/media/promotion/color/material/import/FAQ edits.
- Promotion time windows are evaluated when mapping raw cached promotion rows, so cached expired/future promotions are not applied.
- Home event availability remains uncached. Order/checkout, stock enforcement, coupon validation and registration logic are unchanged.
- No schema migration, live data changes, dependency updates or production deployment.

## Verification

- Release suite with typecheck passed; targeted lint has no errors, only two pre-existing unused-import warnings in admin/actions.ts.
- New tests cover ordering, page limits, publication/visibility filters, bounded offsets, anonymous credentials, shared cache options, image priority ordering, expired promotions, stock availability, source contracts for streaming/cache invalidation, API failures and featured-blog projection.
- Browser at 1440/768/390/320px: eight initial cards; failure/retry retains eight then loads sixteen; all 69 products load without duplicate IDs; final button disappears. First eight card texts, prices, statuses and CTAs match production. No horizontal overflow or browser runtime errors.
- Existing site-media and featured-blog tests pass. An additionally run legacy FAQ source test still expects the former product FAQ prop wiring in an untouched product component; it fails independently of the home changes and was not rewritten as part of this work.
- Production-like timing/payload comparison will be recorded after Preview is Ready. Local dev timings are not used as production performance claims.

## Preview Measurements

Ready preview: https://vemidi-store-ocrjw1pli-ve-mi-di.vercel.app

- Production build passed. Preview remains separate from the live domains; no commit/push/promotion has been performed for this change.
- Three fresh-browser desktop comparisons: production compressed HTML 98.8-99.0KB, Preview 34.6-34.9KB (about 65% smaller). Decoded HTML fell from 799,950 to about 363,789 bytes. This is the HTML response, not a claim that all image/script traffic shrank by 65%.
- Desktop first-content timings: production 1360/1452/4004ms; Preview 1636/600/624ms. Preview LCP was 2536/668/676ms. The first Preview sample included first-load image/runtime costs.
- In the second Preview sample the document finished after 5360ms, but first content and LCP were already visible at 600/668ms: slow lower content no longer blocks the hero.
- A streamed HTTP comparison delivered the home H1 at 307ms, catalog at 404ms and editorial section at 731ms in Preview. The comparable production request delivered those together around 4820ms. These are individual samples, not guaranteed latency bounds.
- One mobile simulation (390px, 1.6Mbps, 100ms latency, 4x CPU slowdown) saw production first content/LCP at 26472/27112ms and Preview at 2008/6592ms. The production outlier shows the previously observed variability; it is not used as a universal speedup claim.
- Preview load-more and 1440/768/390/320px overflow checks passed. Image quality/optimization settings were not changed.

## Release Approval

The user tested the Preview, confirmed faster loading and approved GitHub publication and production deployment on 2026-10-20. The release checks passed again before committing the approved changes.
