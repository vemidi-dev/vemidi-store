# Workshop calendar preview

## Scope

- Cards/calendar switch on the existing events page, with a direct calendar link from the home page. The selected view is a URL parameter, so refresh and navigation retain the view.
- Monday-first monthly desktop calendar with month navigation, month picker, today shortcut and selected-day program with actual event images, prices, age and availability.
- Mobile/tablet monthly agenda instead of a cramped seven-column layout.
- Published workshops only, loaded from existing event records. Past and full workshops have explicit statuses; events without a date remain visible below the calendar.
- Busy days show the first two entries and a more button exposing the complete day program. Empty months can jump to the next upcoming workshop when available.
- Existing card layouts, past-event section, gallery and reservation flow remain intact. No database migration, booking writes or admin changes.
- Calendar date arithmetic uses date-fns; event timestamps are grouped and displayed in Europe/Sofia independently of visitor timezone. Sessions are listed on their start date.

## Verification

- Full release test suite including typecheck passed.
- Five calendar unit tests cover month/week boundaries, leap years, invalid month input, year limits, chronological grouping, Sofia midnight/DST, saved schedules/statuses and minimal data projection with multiline prices.
- Targeted ESLint passed.
- Playwright at 1440/1024/768/390px: cards/calendar links, view persistence after reload, selected-day updates, month navigation, today, empty month and no horizontal overflow or hydration errors with browser timezone America/Los_Angeles.
- Synthetic local fixture: four sessions in one day, more button, full status, undated workshop, next-workshop shortcut and year limits. Fixture and generated route types removed before deployment; no live records changed.
- npm audit does not flag date-fns. The repository has 14 existing dependency findings, outside this calendar change; no broad automatic upgrade performed.

## Visual follow-up

- Calendar entry thumbnails for both weekday and weekend events; compact responsive image sizes avoid requesting large images for tiny tiles.
- Saturday and Sunday columns are twice as wide as weekdays and have a subtle background. Selected day has an inset outline; shorter empty rows preserve compactness.
- Left-aligned month dropdown uses explicit Bulgarian month labels, independent of operating-system language. Options include nearby years and years with published workshops; arrows remain available for any year in the supported range.
- Cards/calendar switch has larger hit areas, a stronger outline, higher contrast and a clear selected state.
- Playwright verified thumbnail loading, weekday/weekend entries, 2:1 column widths, dropdown changes, empty months, busy days and the view switch at 1920/1440/1024/768/390px, with no horizontal overflow or hydration errors.

## Monthly Program Follow-Up

- Desktop sidebar now lists the selected month's workshops chronologically, each with its date and existing photo/time/age/price/status/details.
- Up to five entries initially; Show more adds five. The list has bounded height and keyboard-accessible scrolling, without stretching the calendar's empty space.
- Calendar event selection reveals even an entry beyond the initial page, highlights it and scrolls it into view, respecting reduced-motion preferences. Selecting a date or its More action reveals all sessions for that day without filtering out the rest of the month.
- Changing month or Today resets pagination/selection. Empty-day selection retains the month list; mobile keeps the complete dated monthly agenda.
- Playwright verified 5/10/12 pagination, monthly reset, automatic reveal/scroll, busy-day reveal, empty days, dates on each entry and responsive layouts at 1440/1024/768/390px. Temporary local fixture used no booking writes and was removed before deployment.

## Compact Month Selector

- Month selector simplified to the selected month and three months on either side (at most seven options). The window follows selection and arrow navigation, including year boundaries; Today resets it.
- Six calendar unit tests, typecheck, targeted ESLint and browser checks for the seven-option range and mobile/desktop layout passed.

## Release Status

User approved the complete calendar and follow-ups for production on 2026-10-17. Full release suite (typecheck plus regression tests) passed before release. No database migration is required.

Preview: https://vemidi-store-1iwi7w8sr-ve-mi-di.vercel.app/sabitiya?view=calendar#programa
