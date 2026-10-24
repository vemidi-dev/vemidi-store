# Portrait Workshop Photos

- Changed only the individual event photo gallery from landscape 3:2 to portrait 4:5, matching the product detail gallery. The previously approved event hero and other listing/calendar layouts are unchanged.
- Images use proportional cover fitting, not stretching. The enlarged dialog still uses contain fitting to show the complete original image.
- Retained the existing responsive layout: two columns from 640px, one on smaller screens. Added accurate image sizes for the taller frames.
- No migration, uploads, event data edits or registration submissions.

## Verification

- Release suite and typecheck passed; a regression test compares the portrait ratio with the product gallery and checks the existing enlarged-view behavior.
- Playwright on the published T-shirt workshop: all three photos present; first photo decoded successfully at 1440/1024/768/390/320px, width/height ratio 0.8 at each size, cover fitting and no horizontal overflow.
- Desktop frame: 536x670px. Mobile frame at 390px: 350x437.5px.
- Open, next, previous and Escape-close of the enlarged dialog passed; enlarged image uses contain. No browser runtime errors.
- Desktop screenshot inspected. Production publication requires user approval.
- Added explicit deployment exclusions for the unrelated local sculpfun-tools directory/archive. The initial Preview upload that included them was removed and replaced; local files remain untouched.
- Ready Preview: https://vemidi-store-pzwaag4sc-ve-mi-di.vercel.app/sabitiya/rabotilnica-risuvane-na-teniska-18-10-2026#photos
- Remote Preview smoke passed at 1440px and 390px: portrait frames, decoded images, cover fitting and no mobile horizontal overflow. Production remains unchanged.
