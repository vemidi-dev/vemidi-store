# Event admin and gallery release

User approved production rollout after Preview QA of event tabs, deletion and gallery compression.

## Included

- Events/Participants tabs and direct participant links from admin notification emails.
- Collapsed participant accordions and preserved draft/filter state on tab switching.
- Permanent deletion of cancelled participants/bookings, confirmations, version guards and retry tombstones.
- Archive-gallery browser compression, bounded multipart size, preserved inputs after preparation/network failure, small-image support.
- SQL migration, regression tests and feature reports.

## Preflight

- `npm run test:release` passed (TypeScript and all configured release groups).
- Offline PostgreSQL/PGlite regression script passed, including deletion, stale indexes, original prices, unchanged capacity and retry protection.
- Read-only live readiness probes confirm `delete_event_registration` and `manage_event_registration_checked` exist and reject unauthenticated execution with `admin_required`. These probes modify no registrations.
- Approved combined Preview: https://vemidi-store-mnqhx73zl-ve-mi-di.vercel.app, READY.
- `main` aligned with `origin/main`; unrelated `vemidi-organization/` excluded.

## Rollout

Push this release to main, wait for matching GitHub checks and Vercel build, explicitly promote the matching deployment, then verify both custom domains. Exact commit/deployment and final checks are recorded in the chat after completion. No real uploads, deletions, reservations, or template transfers are performed for release verification.
