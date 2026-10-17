# Event cards and sharing

## Changes

- Shared full event cards for the events index, home upcoming events and related events.
- Separate icon rows for date, time, address, age and availability. Prominent multiline price text; existing pricing calculations unchanged.
- Visitor sharing uses the canonical configured site URL, native Web Share when available, and a Facebook/copy fallback otherwise. Clipboard denial exposes a selectable URL; cancellation stays silent.
- Optional per-event Facebook URL in the existing registration settings JSON, validated on the server and before rendering. No database migration required.
- Follow link is hidden when unset. Copied event drafts do not retain the original Facebook URL.
- Compact home past-event carousel also exposes sharing outside its navigation link.

## Checks

- Release unit suite passed, including the new social URL/settings tests.
- TypeScript typecheck passed.
- Targeted ESLint passed.
- Playwright checks at 1440, 768 and 390 pixels: no horizontal overflow or nested interactive links, multiline pricing visible, native sharing, cancellation, fallback, clipboard success/denial and admin JSON update passed.
- Temporary local fixture used real published event images with synthetic display settings. No reservations, Facebook posts or live data changes performed.
- Preview approved by the user on 2026-10-17. Full release suite (including typecheck) passed before the production release.

Latest preview: https://vemidi-store-dkk5xbfgs-ve-mi-di.vercel.app/sabitiya

## Compact layout follow-up

- Events index now uses 1/2/3/4 columns at phone/tablet/desktop/wide desktop widths, with a wider content area from 1536px.
- Reduced card padding, heading size, excerpt length and vertical spacing while preserving separate fact rows and multiline prices.
- Typecheck and Playwright checks at 390, 768, 1280 and 1920px passed, including horizontal overflow checks.

## Card density follow-up

- Removed excerpts and full addresses from cards; detail pages retain the full information.
- Two-line titles, date without weekday, compact schedule, age and availability on one wrapping row with a separator.
- Compact sharing and Maps links share a footer; exact saved Maps URL takes priority. Online events do not show a physical-location link.
- Prices retain their multiline formatting and on-site payment note. Optional Facebook follow action remains available.
- Typecheck, targeted ESLint, 19 pricing/maps/social tests and Playwright checks at 390/768/1280/1920px passed. Browser checks covered loaded event images, column counts, overflow, external Maps links and copy fallback.

## Manual QA

1. Edit an event and set its actual Facebook event URL, then save and reopen.
2. Check the event card and detail follow links open that event.
3. Check Share on a mobile device. Offered apps depend on the device/browser; Instagram and TikTok are not guaranteed targets.
4. Clear the optional Facebook URL and verify the follow button disappears.
