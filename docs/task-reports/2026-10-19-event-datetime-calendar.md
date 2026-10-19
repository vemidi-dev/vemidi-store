# Event Date Entry and Calendar Navigation

## Changes

- All event create/edit surfaces use an explicit DD/MM/YYYY HH:mm text field and a Bulgarian Monday-first calendar picker instead of browser-locale datetime-local controls.
- Hours use the 24-hour convention (00:00 through 23:59). Existing Sofia timezone conversion, DST handling and backend date-order checks remain in place.
- Selecting a day preserves the entered hour. Date picker is viewport-constrained, supports Escape/outside-click dismissal and does not submit the form.
- Old ISO local datetime drafts are converted to the new display format on restoration. New drafts, resets and invalid input were checked.
- Public calendar has three fixed month buttons: current Sofia month plus the next two. Selected year replaces Today/previous/next controls; December-to-January rollover is supported.
- Every displayed grid day includes its events, including leading/trailing dates from neighboring months. The agenda uses the same date range, so boundary events can be selected and revealed in the list.
- On desktop, calendar content determines the row height. The right agenda stretches to the same height and scrolls within it; all sessions remain visible in busy day cells. Mobile retains the grid and stacked agenda.
- Previously approved proportional event cover and single-row sharing buttons are retained.
- No database migration or live event/registration changes.

## Verification

- Unit coverage includes Bulgarian/legacy date round trips, 24-hour invalid times, DST, current-plus-two month options and year rollover, boundary events and layout contracts.
- Playwright in an en-US browser checked typed 13:00/14:00 values, rejection of 24:00, calendar date selection preserving time, draft reload, legacy draft conversion, reset, Escape and picker bounds.
- Calendar fixture tested at 1440/1024/768/390/320px with twelve sessions on one day and two on the following month's boundary day. All were shown without horizontal overflow. Desktop calendar/agenda heights matched at 1371.25px and 1363.25px.
- Boundary event selection revealed the correct agenda entry; month buttons remained fixed while switching months.
- Real public event calendar was checked: visible thumbnails decoded, November 1 appeared in October's last row, and desktop panels both measured 751.578125px.
- Temporary fixtures and browser scripts were removed before deployment. No test registrations submitted.

## Release

Preview only; production promotion requires approval.

Ready preview: https://vemidi-store-9ondl1sll-ve-mi-di.vercel.app/sabitiya?view=calendar#programa

Full release suite (including typecheck) and targeted ESLint passed after removing fixtures. Vercel production build completed successfully; this deployment is Preview only.
