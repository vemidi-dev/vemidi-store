# Conditional questions and individual participant cancellation

## Scope

- Per-participant questions support `materialsWhen: studio | home`; omitted means all participants. Admin select: "Показвай при". Conditions are only valid for participant questions with materials pricing enabled.
- Changing question scope to registration, or disabling materials pricing, clears its condition. Existing unconditional questions remain unchanged.
- Browser and server share the applicability rule. Hidden answers are cleared on material changes and discarded server-side, even when forged or stale. Unknown question IDs still fail. Required applies only while the question is relevant.
- Admin rows keep the booking contact plus each named participant, with independent cancel/restore and confirmation. The entire booking can still be cancelled or restored explicitly.
- Registration form visually separates each participant using a subtle sage-tinted band, left border, numbered heading/divider and spacing; semantic fieldset legends are preserved. Browser checks at 1440/768/390/320 verify no overflow and independent inputs/material choices; removing one person preserves the other's data.
- Cancelled people remain in the JSON array, preserving their names, answers, material choice, saved price and cancellation/restoration timestamps. Indexes remain stable because cancellation never removes/reorders people.
- Active counters, CSV active count, preparation quantities and payable total exclude cancelled people. CSV retains cancelled participant history.

## Database

Apply `supabase/event_participant_management.sql` after `event_registration_forms.sql` and `event_materials_pricing.sql`. The latter is the preceding two-price feature's migration; run it first if not already applied.

- Adds nullable `original_total_amount` as a historical fallback for old bookings without per-person price snapshots. No destructive data migration.
- New authenticated-admin-only `manage_event_registration` locks event then booking, changes participant status and capacity in one transaction, derives totals from saved booking prices rather than current workshop prices, and returns the authoritative row.
- Repeated cancellation/restoration does not adjust seats twice. Last participant cancellation sets booking status cancelled. Individual restoration revives only that person. Entire-booking restoration explicitly restores all original people and requires enough seats for all.
- Confirming an already active partial booking does not restore its cancelled people.
- Existing `update_event_registration_status` delegates to the same atomic implementation, so old callers cannot release the original headcount after a partial cancellation.
- `participant_count` remains the original headcount, compatible with its existing 1..10 constraint. Active count is computed from participant statuses. Legacy bookings without named participants retain whole-booking management only.
- No automatic cancellation emails, refunds, or payment collection were introduced. Existing confirmation-email behavior is unchanged.

## Verification

- Release unit suite, scoped ESLint and TypeScript checked.
- Offline PostgreSQL/PGlite: repeatable migrations, individual cancellation, repeat operations, last-person cancellation, restore-one and restore-all, mixed saved prices, price changes, insufficient capacity rollback, old caller compatibility, legacy unnamed bookings, invalid indexes/status and non-admin/anonymous denial.
- Playwright/Edge: mixed two-child form requires shirt size only for studio materials, clears hidden answers on switching, admin condition selection and scope reset, independent participant buttons, cancellation confirmation, layouts at 1440/768/390/320. Screenshot reviewed.
- All test fixtures were local and removed. No actual registrations, workshop settings or live SQL were changed by these checks.
- Unknown historical prices stay unknown after cancellation/restoration (not converted to zero); zero-price bookings remain supported. This SQL edge case was checked against the final local migration.
- Preview: https://vemidi-store-ejq4it17t-ve-mi-di.vercel.app (`dpl_3asBJx2tGafJ1yLdNZxwNcjGmDu1`), READY; admin smoke redirects to login (307). SQL scripts are applied manually, never by Vercel build.
- Visual participant separation Preview: https://vemidi-store-sx5jc84am-ve-mi-di.vercel.app (`dpl_HgxRSTwbn5ZojRKmzSE2Kh7M7SJF`), build/deployment completed. Scoped registration tests 15/15 and TypeScript pass. No additional migration for this visual change.

## Rollout

Preview shares the store database. Apply migrations before testing real status changes. Do not publish new conditional/two-price workshops until the compatible application code is promoted. No production deployment or Git push performed in this task.
