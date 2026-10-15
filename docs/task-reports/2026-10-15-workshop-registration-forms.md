# Workshop page and configurable registration forms

Date: 2026-10-15

## Scope

- Event detail page: image and reservation summary first, Bulgarian month names and Sofia times, actual per-event price/capacity, anchors, description, included materials, gallery/lightbox, maps/contact and registration.
- Primary reservation text: **Запази място**.
- Participant add button: **Добави участник**.
- Related cards show actual upcoming events, not past events.
- No sample dates, images, prices, capacity or age limits were written to event records.

## Per-event admin settings

- Allowed participant types: child, adult, child with guardian.
- Child age: optional, required or hidden. Adult age remains optional.
- Name is collected for every participant; contact name, phone and required email are collected once.
- Additional questions: text, nonnegative number or dropdown; required/optional; once per registration or separately for each participant.
- Example: required participant dropdown "Размер тениска" with actual available sizes as options.
- Separate gallery per event, up to 12 images, with editable alternative text.
- Images are optimized in the browser before server action submission. Oversized batches are rejected locally while keeping the form populated.
- Copy as draft preserves event text and registration settings; dates, hero/gallery and external registration URL are cleared. No attendees are copied.
- New-event local browser draft includes question configuration and existing gallery references. Selected local files cannot survive a page reload.

## Reservation rules

- One crafting participant occupies one seat and pays one event price.
- A guardian accompanying a child does not occupy another seat or pay another participant fee. A guardian taking part in the activity must be added separately as an adult.
- Existing maximum of ten participants per registration remains.
- Global payment text is "Плащане на място". No online payments or deposits were added.
- Server validates answers against the saved event configuration and snapshots trusted question labels, types and answers.
- Participant count and payable total are derived from participants, not submitted client totals.
- The v2 RPC locks the event and reuses the existing atomic reservation checks. It also serializes retries with the same idempotency key.
- A changed price or configuration is rejected instead of accepting a stale displayed form.
- Existing cancel/restore status action continues to restore/consume seats using the stored participant count.
- Individual participant details and total appear in admin and confirmation emails.
- Admin search covers participant names/answers. Preparation totals group participant dropdown answers, excluding cancelled registrations.
- CSV export contains the filtered registration list and participant details, with spreadsheet formula protection.

## Required migration and rollout

Run **`supabase/event_registration_forms.sql`** in Supabase SQL Editor, after the existing blog/events schema.

New columns:

- `events.registration_settings` (JSONB, default `{}`).
- `events.gallery_images` (JSONB, default `[]`).
- `event_registrations.participants` (JSONB, default `[]`).
- `event_registrations.registration_answers` (JSONB, default `[]`).
- `event_registrations.total_amount` (numeric).
- Service-only RPC `register_for_event_v2`.

The SQL is additive and repeatable. Historical registrations are not changed. The old RPC remains available while the previous production deployment is running. New code can display historical registrations and render the legacy signup form before migration, but the new admin settings/gallery need the new columns to save.

The user ran the migration in Supabase. A subsequent read-only HEAD query confirmed the new columns on both tables. At the initial Preview handoff no production deployment, commit or template transfer had been performed. The later exact Maps pin update and production approval are recorded below.

Recommended order: apply migration, deploy Preview, perform authenticated manual QA, then approve production rollout.

## Verification

- `npx tsx --test tests/event*.test.ts`: 42/42 pass.
- `npm run test:release:unit`: pass.
- TypeScript: pass before final build.
- ESLint on changed application and test files: pass.
- `git diff --check`: pass (line-ending notices only).
- Offline PostgreSQL/PGlite executed the actual old RPCs plus the new SQL migration: repeatable migration, participant snapshots, totals, retry idempotency, stale settings/price, capacity, cancel/restore, past/private/external event rejection and anonymous RPC access denial all pass. This is not a live Supabase or concurrent multi-session load test.
- Playwright/Edge: participant add/remove, separate shirt selections, guardian explanation, correct totals, lightbox next/Escape, no horizontal overflow at 1440/1024/768/390/320 widths, and admin question configuration restored after reload all pass.
- Temporary QA route was removed after verification. No test registrations or customer notifications were sent to production.
- `npm run build`: pass with the existing unrelated lint/workspace-root warnings. Initial sandboxed attempt could not resolve Google Fonts; retry with network/filesystem access succeeded.

## Manual Preview QA after migration

1. Edit a draft workshop: choose allowed types, price, capacity and required child age.
2. Add a required participant dropdown "Размер тениска" and enter one real size per line.
3. Save, reopen and verify settings and Sofia dates/times.
4. Add gallery photos, save, verify the gallery and lightbox in admin Preview.
5. Publish a dedicated test workshop with a future date; reserve for two test participants with different sizes, one accompanied by a guardian.
6. Verify two seats consumed, total equals twice the event price, and both admin/customer emails contain the correct details.
7. Check admin preparation totals and CSV. Cancel once, verify two places returned; restore only when sufficient places remain.
8. Verify a sold-out workshop cannot accept another reservation and old registrations still display.

Unrelated `vemidi-organization/` content was not modified.

## Preview rollout

- User approved a Preview deploy after applying the migration.
- Preview URL: https://vemidi-store-i6ka36ig0-ve-mi-di.vercel.app
- Inspect: https://vercel.com/ve-mi-di/vemidi-store/HGxes9m3TjX5orbQNuSQG4JTk7RA
- Command: `vercel deploy --yes`, without `--prod` and without promotion.
- Added `.vercelignore` to exclude environment files, caches, temporary outputs and the unrelated nested project from upload.
- Deployment `dpl_HGxes9m3TjX5orbQNuSQG4JTk7RA`: READY, Preview (target null), successful remote build.
- Unauthenticated smoke: `/admin?tab=events` -> 307 admin login; `/admin/login`, `/sabitiya` and `/sabitiya/rabotilnica-esenna-magia-17-10-2026` -> 200. Workshop HTML contains the new summary and participant-add button. No server 5xx responses.
- Authenticated editing, actual reservation/email delivery and cancel/restore on Preview remain manual QA. No live test registrations were created during this deploy.
- Preview uses the configured Preview environment. Test registrations may share live Supabase data; use a dedicated test workshop.

## Layout feedback revision

- Removed the permanent secondary column next to the workshop description.
- Includes/materials/host now render as compact muted details below the full-width description, only when nonblank; no reserved empty space.
- Admin editing was previously nested in the Actions table cell. It now occupies a separate row spanning all five columns, with a close button and scroll-to-editor behavior.
- Closing/reopening the editor preserves unsaved form values. Other edits/publication behavior is unchanged.
- On small screens the list condenses period/status into the title cell; the editor remains full-width and its fields stack appropriately.
- Playwright checked widths 1440/1024/768/390/320: editor uses full available table width without document overflow; close/reopen preserves input; blank supplementary fields render no container.
- No additional migration is required for this layout revision.
- TypeScript, ESLint on the three revised components, and all 42 event tests pass.
- Revised Preview: https://vemidi-store-rf1o281pd-ve-mi-di.vercel.app (deployment `dpl_6VXwrEjqPjjMtyooBLAbnavPRXM6`). No promotion to production.
- Remote build completed successfully; deployment is READY (Preview).

## Page polish, phone validation and rich-text editor

- Event registration now checks phone format in the browser and on the server before any registration RPC/rate-limit query. Accepts local/international numbers with 7-15 digits, optional leading plus, spaces, hyphens and balanced parentheses; rejects symbols-only/letters. This validates format, not ownership or existence of the number.
- Summary and practical-information contact links now say "Свържете се с нас" and open `/kontakti`, without displaying the shop phone in those blocks. Site footer and notification contact details are unchanged.
- Added Lucide icons for date/time/place/age/group, a subtle availability badge, clearer map links with external-link icons, and hover/focus states on section anchors and the reservation button.
- Includes/materials remain compact below the description, with a faint sage background. No secondary description column was restored.
- Reused `BlogRichTextEditor` in event create/edit. Opt-in `preserveLineBreaks` supports single newlines in both workshop editor preview and public rendering; default blog rendering is unchanged.
- Local draft persistence includes the rich-text value, including toolbar-generated changes, and restores it after refresh.
- User confirmed Google Maps resolves the address to the wrong location. Added optional per-event exact `maps_url`, with Google Maps HTTPS URL validation and priority over address search. A fallback search uses the actual address rather than adding the workshop/location name.
- Run `supabase/event_maps_url.sql` before saving an exact pin. Existing event saves with a blank new map field remain compatible before migration; attempts to save a pin without the column show a migration instruction, preserving the form.
- User supplied the exact pin and confirmed the Maps migration. Updated only `maps_url` for `rabotilnica-esenna-magia-17-10-2026` to `https://maps.app.goo.gl/KPoXd7e1qxNkyneQA`. Other event fields were not changed. No pin/coordinates were inferred.
- 57 event/blog tests passed. TypeScript passed after test type narrowing.
- Playwright/Edge: phone validity, contact hrefs, exact map href, nav hover, preserved rendered newlines, shared editor formatting/preview, rich-text local draft restore, and no horizontal overflow at 1440/1024/768/390/320 widths passed. Temporary QA route/script removed.
- Release unit suite and changed-file ESLint passed. Offline SQL verification also applied the additive Maps migration twice successfully.
- Polish Preview URL: https://vemidi-store-7yd3ehvc8-ve-mi-di.vercel.app (deployment `dpl_CVda4TRGci62D64uE3YydVZ2Ajw2`); no production promotion.
- Polish remote build succeeded and is READY. Public event returns 200, unauthenticated admin returns 307 to login.
- Live Preview browser smoke confirmed both map links use the user-provided pin, invalid phone symbols are rejected, valid formatted phone is accepted, and the contact link opens `/kontakti`. No registration was submitted.

## Production release approval

- User approved publishing all workshop changes to the live store on 2026-10-15 after Preview review.
- User explicitly deferred the shirt-workshop end-to-end registration test until that workshop is ready; this remains a known manual QA gap, not a passed test.
- Added the 57 event/blog regression tests to the standard release test runner so future CI runs cover these changes.
- Release target: https://vemidi-crafts.com. Use the GitHub integration's production build for the release commit, then verify its custom-domain aliases and live page; final deployment identity and verification are reported in the release chat.
- Final `npm run test:release` (including TypeScript and the new workshop regression group): pass.
- No template transfer was requested for this release.
