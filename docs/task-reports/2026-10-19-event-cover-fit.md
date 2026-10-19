# Event cover proportions

## Change

- Detail cover frame aligns with the booking panel's top and bottom edges on desktop. The image uses contain fitting, so the complete artwork stays proportional rather than being cropped or distorted. Mobile retains a stable 16:10 frame.
- Booking panel is 304px at laptop widths and 320px at larger widths, leaving more horizontal space for the image inside the existing page width.
- Event listing/home/related cards use the same image field with contain fitting, avoiding the need for separately cropped uploads. Other ContentImage consumers retain the cover default.
- Mobile keeps the full image above the booking information. Narrow background bands are expected when an uploaded poster has a different aspect ratio; no image content is removed.
- No database migration or live event/image changes.

## Verification

- Three regression tests protect shared image reuse, uncropped fitting, default behavior for other image consumers and aligned desktop frames.
- Full release suite, including typecheck, and targeted ESLint passed.
- Playwright checked the actual published Pystri Gubki poster at 1440/1024/768/390/320px: images decoded, contain fitting, 16:10 stable frame, 304/320px desktop panel, image more than twice panel width, correct mobile stacking, identical uploaded source on listing/detail and no horizontal overflow or runtime errors.
- Desktop image area measured 748x467.5px at 1440px and 636x397.5px at 1024px. Original poster ratio is about 1.9:1 and is fully visible.
- Temporary browser script removed after verification. No registrations submitted.

## Equal-Height Follow-Up

- User requested matching top/bottom edges for the left image frame and right information panel. Both measure 605.25px high on the tested desktop layouts, with image contain fitting retained.
- Playwright confirmed equal desktop edges at 1440/1024px and unchanged mobile stacking/aspect ratio at 768/390/320px, with decoded images and no horizontal overflow.
- Full release suite passed after the alignment change.

## Release

Preview only; production promotion requires approval.

Previous preview: https://vemidi-store-adktdxcgx-ve-mi-di.vercel.app/sabitiya/pystri-gubki-22-10-2026

## Full-Frame Follow-Up (Supersedes Contain on Detail)

- At the user's request, detail images now stretch to fill the existing aligned frame without cropping or background bands. This deliberately changes original proportions when the frame ratio differs. Listing images retain contain fitting; other ContentImage defaults are unchanged.
- Detail sharing and Facebook follow buttons use a compact bordered single row. Existing card actions and sharing fallback retain their behavior.
- Playwright verified loaded fill images, aligned desktop frames, mobile stacking and no horizontal overflow at 1440/1024/768/390/320px. Both buttons fit on one row inside the panel padding at all five sizes. Sharing fallback opened and closed successfully.
- Desktop image/panel heights are now 561.25px; image widths remain 748px at 1440px and 636px at 1024px. Mobile frame remains 16:10.
- Full release tests passed after the fitting change. Targeted lint passed; final narrow-button adjustment was browser-verified. No registrations submitted or event records modified.

Latest preview (Ready): https://vemidi-store-dyxk2d8gd-ve-mi-di.vercel.app/sabitiya/pystri-gubki-22-10-2026

## Proportional Follow-Up (Supersedes Stretching)

- User rejected the distortion from fill. Detail now uses object-cover: uniform scaling on both axes, filling the aligned frame with centered edge cropping when aspect ratios differ. No empty bands or unequal-axis stretching.
- Removed the unused fill mode from ContentImage; listing contain mode and inline social actions are retained.
- Full release suite passed. Playwright confirmed loaded cover images, desktop alignment, single-row actions and no horizontal overflow at 1440/1024/768/390/320px. Desktop screenshot inspected; edge cropping is expected and was explained to the user.
- Preview only, no production promotion or event data changes.

Proportional preview (Ready): https://vemidi-store-qkhno8050-ve-mi-di.vercel.app/sabitiya/pystri-gubki-22-10-2026
