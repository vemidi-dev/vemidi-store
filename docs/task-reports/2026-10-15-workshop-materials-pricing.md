# Workshop pricing by material source

Date: 2026-10-15

## Behavior

- Optional "Две цени според материалите" setting per workshop. Existing single-price workshops are unchanged.
- Admin enters separate participant prices and material descriptions for studio-provided and participant-provided materials.
- Prices allow zero, up to 999999.99 EUR, with at most two decimal places. Both descriptions are required, up to 1000 characters.
- Final admin correction: one always-visible "Цена — свободен текст" textarea, four rows, resizeable, up to 1000 characters, in both pricing modes. Saved as optional `registration_settings.priceDisplayText`; legacy nested display text is still read. Numeric calculation inputs are explicitly labeled and managed within the same editor, with no imperative DOM disabling/hiding of another field. Create/edit forms no longer duplicate the old price input. Stored base `events.price` remains numeric; actual dual choices live in `registration_settings.materialsPricing`.
- Detail-page summary, home event cards and event listing display admin-defined free price text (up to 1000 characters), or the two exact prices separated by `/` when blank. No price interval. Detail-page text is larger and preserves line breaks. Both actual numeric offers are emitted in structured data; display text does not affect calculations. Draft restore/reset also preserve this optional text.
- Material descriptions appear under the main description and beside each participant's choice in the reservation form.
- Each participant must explicitly choose a material source. A booking can mix both options. A guardian still does not consume another seat or participant fee.
- The summary remains unpriced until all participants have selected materials; then it sums integer cents.
- Trusted material label, description and unit price are saved per participant, and the computed total is saved with the booking. Later event changes do not rewrite existing booking snapshots.
- Existing email/admin/CSV output includes the saved options and amounts. Preparation totals count active participants by material option, excluding cancelled bookings.
- Partial admin price drafts survive reload, including temporarily blank prices. Switching back to single-price mode removes the materials pricing contract from the saved settings.

## SQL and compatibility

Apply **`supabase/event_materials_pricing.sql`** after `supabase/event_registration_forms.sql`.

- Adds service-role-only `register_for_event_v3` with the existing argument contract; no table columns or existing registrations are changed.
- v3 locks the event, checks the expected config/price and normalizes material choices from saved configuration. Client-submitted prices/text/labels are discarded.
- Reuses v2 for participant/publication/capacity/idempotency checks, then records the correct mixed total in the same SQL transaction.
- Existing v2 remains unchanged. Single-price bookings continue using v2; only material-priced bookings call v3.
- Missing v3 never falls back to flat pricing; registration returns an unavailable message instead.
- No production SQL, event configuration, reservation or notification was written by this task.

## Rollout

1. Apply the additive SQL migration.
2. Review the new UI in Preview using an unpublished draft.
3. Deploy the new application code to production before publishing workshops with the two-price configuration.
4. Test an actual mixed booking on a dedicated workshop once the new production code is live.

Important: Preview currently shares the configured store database. The previous production application does not understand the new material choices. Do not enable/publish this configuration on a live workshop from Preview before the new code has been promoted.

## Verification

- `npm run test:release`: initial pass. After free-text revision, `npm run test:release:unit` passed (67 workshop/blog tests plus existing release groups); TypeScript passed.
- Offline PostgreSQL/PGlite: migration repeatability; studio/home mixed totals; forged prices/text normalized; retry idempotency; stale price/settings; invalid choice rollback; cancel/restore capacity; anonymous/authenticated execution denial all pass. Existing v2 regression scenarios also pass.
- Playwright/Edge: initial independent participant radio groups, mixed 30.50 EUR total from 18 + 12.50, removing a participant, legacy single-price mode, base field toggle and partial draft recovery passed. Free-text revision additionally verified exact multiline display, serialization, draft restoration, reset and no horizontal overflow at 1440/768/390/320 widths. Sidebar screenshots inspected.
- Temporary test route/script removed. No real registrations submitted.
- Follow-up browser regression: free price text and both numeric prices are editable; legacy price hidden in dual mode, visible/editable in single mode; typed display text survives toggling; reset and mobile layout pass. Pricing unit tests: 10/10 pass.
- Final multiline regression: real EventCreateForm + AdminFormDraftKeeper tested with keyboard Enter, 2+ lines, more than 160 characters, reload persistence, mode toggling, reset and mobile overflow. Unit coverage includes single/dual mode serialization through server form preparation and 1000-character validation. No real event was saved by this check.
- Final remote build and Preview identity recorded in the task chat.
- Preview: https://vemidi-store-3fx590vno-ve-mi-di.vercel.app (`dpl_3FCaZEzkxi5V6e5Dip3Tg1Pe6fQv`): remote build passed, READY, target Preview. Authenticated new-price save/booking still requires the migration and manual QA.
- Updated free-text Preview: https://vemidi-store-ow3own1g7-ve-mi-di.vercel.app (`dpl_6pzxYrungoLdHderBmkNYeccrRzc`): remote build and deployment completed. Production remains unchanged.
- Latest admin field clarity fix Preview: https://vemidi-store-3ccl7dsh4-ve-mi-di.vercel.app (`dpl_31i4KCSWXVss7dNekyhJgRhHh7K5`), READY. Legacy single-price field is hidden in dual-price mode, not presented as a disabled control.
- Final always-visible multiline field Preview: https://vemidi-store-ivmrcy6ef-ve-mi-di.vercel.app (`dpl_HsC7fy8r2TRXYrE5vGMR8gGuYvq5`), READY. TypeScript, scoped ESLint and release unit suite passed. Production unchanged.

No production deployment, Git push or template transfer was requested/performed for this new feature.
