# Christmas Home Hero Preview

- User supplied a 1774x887 PNG (2:1). Created a proportional, non-upscaled WebP at quality 86, 214386 bytes. The original outside the workspace is untouched.
- Full-width photographic hero replaces the split card-like composition. Desktop text is constrained to the left 38-40% with a light feathered overlay; the existing natural left-side softness is sufficient without expensive CSS blur filters.
- Revision after user feedback: replaced viewport-wide overlay/contain fitting with an actual 2:1 image scene and an image-local transparency mask. This eliminates the visible vertical image boundary on ultrawide screens and the horizontal letterbox bands on smaller desktops. Tablet now retains a side-by-side composition; phones use a vertically feathered transition below the copy.
- Existing admin copy is preserved. Added two main product/workshop links; retained all four existing discovery links in a compact unframed band below the hero.
- A deployment-only HOME_HERO_PREVIEW_IMAGE=christmas flag selects the supplied image. Production explicitly ignores it, preserving configured admin media. Before a production release of the design, the approved image must be selected through the existing home.hero media configuration; no database content has been changed for this preview.
- No new client JavaScript, image generation, migrations, product edits or production deployment.

## Verification

- Release suite and typecheck passed. New tests check preview isolation, image priority, admin copy and link preservation, responsive reserved dimensions and proportional fitting.
- A broader existing performance-priority source suite has unrelated stale expectations for the thank-you hero and shared VisualPageHero; those components were not changed. Updated only its home layout assertion for the new CSS layout.
- Local Playwright screenshots at 320, 390, 768, 1024, 1440, 1920 and 2560px. Corrected the 1024px copy width so it stays to the left of the product region. No horizontal overflow; correct existing Playfair font.
- Local dev server stopped; generated next-env path restored before delivery.
- Ready Preview: https://vemidi-store-gth0ydghl-ve-mi-di.vercel.app/ (dpl_4CoUMRN5Z3mJmp6QegfphnCCrCeR).
- Remote Preview checks passed at 320/390/768/1024/1280/1440/1920/2560px: Christmas image decoded, no horizontal overflow, no copy/product-zone overlap, next band visible, correct CTA targets and no browser runtime errors. Desktop and mobile screenshots inspected.

## Seamless Blend Revision

- Latest Ready Preview: https://vemidi-store-r73tx6812-ve-mi-di.vercel.app/ (dpl_TFZTNSBdqTcbZPUVz22pcGBi3kBA), superseding the first preview above.
- Remote Playwright passed at 320/390/640/768/900/1024/1280/1440/1920/2560px: no overlap/overflow, photo-local masks applied, exact 2:1 image scene from 768px upward and next band visible.
- Pixel sampling across the former image boundary at 2560px gives max RGB step 0 (previous version 10) across six sampled rows. This specifically tests the user-reported vertical seam, not just element geometry.
- Release suite and Vercel build passed again. Production is unchanged.

## Mobile Actions and Ultrawide Spacing

- Latest Ready Preview: https://vemidi-store-7cob0jzvi-ve-mi-di.vercel.app/ (dpl_71DBAUwFj6f876pPF2BimB6U3yZg).
- Primary CTA now reads "Разгледай продуктите" and retains /produkti as its destination.
- One shared set of two CTA links uses the photo grid area on mobile. The lower link overlaps only the empty upper-left portion of the photo; no product is covered. The photo keeps its complete 2:1 composition, and the mobile hero is shorter.
- Centered the 1440px copy canvas and the photo as a composition within the wide hero; above 1600px the photo moves inward and its decorative right edge feathers out. Measured copy-to-product-region gap stays approximately 165px at 1920/2560/3440px rather than growing with the viewport.
- Remote Playwright passed at 320/390/640/768/1024/1440/1920/2560/3440px: no overflow, preserved 2:1 photo, safe mobile CTA placement, bounded desktop gap, next band visible, two CTA links only and no runtime errors. Desktop and mobile screenshots inspected.
- Release suite and Vercel build passed. Original photo, admin media and production remain unchanged; no new image generation.

## Supplied Snowflake Banner Comparison

- User supplied koleden banner.png, also 1774x887. Added a separate non-upscaled WebP (208186 bytes) and an opt-in christmas-snowflakes preview value; previous asset/deployments are retained for comparison.
- Ready Preview: https://vemidi-store-6wvd90ch4-ve-mi-di.vercel.app/ (dpl_EmBxF4f5343xpQ9sqJKCD97cNvDC).
- Layout unchanged for a direct image comparison. Targeted hero tests and Vercel build passed. Remote checks at 320/390/768/1440/2560px confirm the new asset decodes, 2:1 proportions, no overflow, correct product CTA and no runtime errors. Desktop screenshot inspected.
- Original PNG and production/admin media remain untouched.

## Admin Image Precedence Fix

- User reported admin image changes were hidden by the explicit comparison-image flag. Uploaded media now always wins, even with a preview banner flag; example banners apply only when no admin upload is configured.
- Ready Preview: https://vemidi-store-kh4qyxr4d-ve-mi-di.vercel.app/ (dpl_HzjyD2F3eiz9BMJdknhhyZ1icbL2).
- Public read confirmed an uploaded home.hero record exists. Remote browser verified the image source matches that saved record rather than either bundled Christmas asset, decodes on desktop/mobile and has no overflow. No media/database writes performed.
- Hero/media tests and Vercel build passed. Previous immutable Preview URLs retain their earlier comparison behavior; use the new URL for admin image testing.
