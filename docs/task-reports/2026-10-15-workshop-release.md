# Workshop pricing and participant management release

User approved production rollout after testing the Preview versions, including the final participant separation visual change.

## Included

- Studio/home materials prices with per-person selection and trusted booking totals.
- Always-visible multiline price display text, separate from numeric pricing.
- Conditional per-participant questions by materials choice, with matching client/server validation.
- Individual cancellation/restoration, preserved participant history, recalculated capacity/totals and preparation counts, and whole-booking management.
- Subtle separated participant bands in registration forms.
- Additive SQL migrations, regression tests and task reports.

## Preflight

- `npm run test:release`: passed, including TypeScript and all configured release groups.
- Offline PostgreSQL/PGlite regression script: passed, including repeatable migrations, mixed prices, individual/full cancellation and restoration, capacity rollback, unknown historical totals and admin access.
- Latest visual/functional Preview: https://vemidi-store-sx5jc84am-ve-mi-di.vercel.app, READY; public workshop smoke returned 200.
- Live read-only migration readiness checks: `original_total_amount` column exists; v3 pricing RPC returns the expected `invalid_registration` for an empty request; management RPC rejects unauthenticated execution with `admin_required`. No registrations were created or altered by these checks.
- `main` was aligned with `origin/main` before committing. Unrelated `vemidi-organization/` is excluded.

## Deployment

Push the release commit to `main`, wait for the matching Vercel build and GitHub checks, then explicitly promote that deployment and verify the custom domain resolves to it. Exact release commit and final deployment identity are recorded in the task chat after verification.

No template transfer, real test reservation or notification is part of this rollout.
