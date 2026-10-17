# Mobile workshop calendar

## Fix

- The calendar grid was intentionally hidden below 1024px, leaving only the monthly agenda. The monthly grid now renders at all viewport widths.
- Compact mobile day cells include the date, an event thumbnail (or calendar icon when no image exists) and a session-count badge for busy days. Whole day cells are selectable.
- Mobile weekends retain extra width without squeezing weekday labels; desktop keeps its existing two-times weekend width and full event tiles.
- Mobile selection highlights the matching agenda entry and scrolls it below the fixed header. Desktop still reveals/highlights the entry in the paginated monthly sidebar.
- Seven-month dropdown, navigation, empty months, full monthly agenda and desktop pagination remain unchanged.

## Verification

- Typecheck and targeted ESLint passed.
- Full release regression suite passed.
- Playwright verified grid visibility at 320/390/768/1024/1440px, loaded thumbnails, two-session badge, matching agenda selection/scroll, empty month, seven-option month filter and no horizontal overflow or hydration errors (browser timezone America/Los_Angeles, reduced motion enabled).
- Actual published event data was read only. No reservations or live data were modified.

## Release

User approved the mobile calendar fix for production. No database migration is required.

Preview: https://vemidi-store-3smcxhs3z-ve-mi-di.vercel.app/sabitiya?view=calendar#programa
