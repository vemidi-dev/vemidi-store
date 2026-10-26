# Product Form Preservation

- Product edit validation previously redirected to the product list for color, personalization and option errors, dropping unsaved edits. Other errors also reloaded the form from saved database values.
- Both create and edit now use the same manual-submit client form. Expected pre-save server validation returns an inline error; it does not navigate, reset inputs or replace local editor state. Authentication and successful/post-create redirects retain their original behavior.
- Added a shared pending context, disabled fieldset and request lock. Restored unsaved-change warnings after failed submits. Other admin forms retain native form status behavior.
- Complete local create drafts take priority over URL recovery data. A successful create clears its draft, but an old success URL cannot clear a newer draft on refresh. Autosave cannot serialize disabled pending fields into an empty draft.
- No database migration or changes to public product pages, pricing or order handling.

## Verification

- Unit tests cover missing color names, long multiline descriptions, complete local draft priority, old success URLs and validation/redirect propagation.
- Local Playwright with the real create panel: a missing color name preserves the exact submitted form including text sections, category and selected image; 30K+ character copy survives draft restoration after refresh.
- Shared save form with local non-writing server fixtures: missing color name, returned server validation, aborted request and successful redirect. Exact FormData snapshots preserved on each failed attempt, including the selected file. No real products created or modified.
- Browser files remain selected for in-place errors; a full refresh still requires selecting files again. Local draft restores text and settings, not file contents.
- Temporary fixture removed before deployment. Local server stopped.
- Release suite, typecheck and Vercel production-mode build passed (existing unrelated lint warnings only).
- Ready Preview: https://vemidi-store-286niuf58-ve-mi-di.vercel.app/admin?tab=products . Production publication awaits approval; no Git commit/push yet.
