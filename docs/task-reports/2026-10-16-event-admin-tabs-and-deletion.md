# Event admin tabs and permanent deletion

## Interface

- `/admin?tab=events` has two accessible tabs: Events and Participants. `eventsView=participants` opens Participants directly, including links from new admin registration emails.
- Events editing and the gallery remain in Events. Switching tabs keeps unsaved event form fields and participant filters mounted. Keyboard arrows/Home/End work; URL records the selected view.
- Event participant accordions are closed initially and collapsed on re-entering Participants.
- A cancelled participant can be permanently deleted independently. A fully cancelled booking can be permanently deleted with its contact data. Active entries must first be cancelled. Deleting the last person removes the booking.
- Irreversible deletion requires explicit confirmation; buttons disable while pending. Inline failures retain the row; successful deletions immediately update the list, counters and export.

## Database and safety

Apply `supabase/event_registration_deletion.sql` after `event_participant_management.sql` before testing mutations in the new Preview. This migration defines functions/guards only; running it deletes no registrations.

- Admin-only deletion locks event then booking, checks its exact version, and permits only cancelled entries. Capacity is untouched because cancellation already released those seats.
- Remaining people's saved prices, choices and answers survive; historical total is reduced appropriately so future restoration does not charge for a deleted person.
- All new admin status changes use a version-checked RPC. A stale index cannot target a different person after an array element is deleted. No unguarded fallback.
- Permanent booking deletion retains only a random idempotency token and deletion timestamp in an inaccessible tombstone table. No names, contacts, participant data or event ID are stored there. An insert trigger prevents old customer retries recreating a deleted booking and rolls back any attempted capacity changes.
- Does not recall previously sent emails, remove email-provider logs or claim full external-system erasure.
- No live participant data was deleted and no production SQL was executed by implementation tests.

## Verification

- TypeScript, scoped ESLint and release unit suite.
- PostgreSQL/PGlite: repeatable migration, active-entry deletion guards, deletion of one/last/all cancelled entries, capacity unchanged, original-price preservation and restoration after deletion, stale version/index rejection, old unnamed bookings, unknown prices, blocked old idempotency retries, anonymous and non-admin denial.
- Playwright/Edge with synthetic data: direct Participants URL, collapsed groups, tab switching and keyboard navigation, preserved event draft, cancelled-only delete controls, irreversible confirmation, failed-auth data retention, desktop/mobile widths 1440/768/390/320. No real deletions.
- Temporary routes/scripts removed after checks.

Production and Git commit/push are not part of this change until user approval after Preview QA.

Preview: https://vemidi-store-r1q87kvmo-ve-mi-di.vercel.app (`dpl_BupL6F8T4tBa83VSMEbRNxo3ky79`), READY. Remote build passed. Direct participants route smoke redirects to login (307). SQL migration is not applied by the deployment and must be run separately before mutation QA.
