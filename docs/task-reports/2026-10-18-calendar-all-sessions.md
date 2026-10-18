# Show all calendar sessions

## Change

- Removed the desktop cell's two-session cap and More action; every workshop for a day is displayed in chronological order.
- Mobile cells now show a separate image and start time for every workshop instead of one image with a count badge. Every session is directly selectable.
- Day rows grow naturally to fit all sessions. Existing monthly sidebar pagination remains unchanged; choosing a session beyond its initial five entries still reveals and highlights it.
- No live event data, dates or reservations modified.

## Verification

- Seven calendar unit tests passed, including a six-session day without truncation.
- Full release suite, including typecheck and regressions, passed.
- Playwright with a temporary read-only local fixture confirmed all six sessions visible/selectable at 1440/768/390/320px, images loaded, no More action in the grid, correct sidebar/agenda selection, sidebar auto-reveal and no overflow or runtime errors.
- Temporary fixture and generated route types removed before deployment.

## Release

User approved this presentation for production on 2026-10-18. No database migration is required.

Preview: https://vemidi-store-e7e61uxpw-ve-mi-di.vercel.app/sabitiya?view=calendar#programa
