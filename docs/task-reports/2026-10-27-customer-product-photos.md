# Customer Product Photos

## Activation

Run `supabase/customer_product_photos.sql` in Supabase SQL Editor after the existing personalization/pricing and order migrations. Deploy this code to Preview first. No existing product or order is modified by the migration; the personalization type constraint and replacement RPC are extended to accept `file`.

The supplied ornament JSON now passes read-only validation against the real category slugs. It retains both the required photo field and required engraving text. No product has been created by the validation check.

## Flow

- Admin editor: new JPEG/PNG photo field; required/optional and surcharge controls retained.
- JSON v2: `field_type: "file"` is supported. Unsupported types produce a blocking, named validation error instead of an empty successful preview.
- Customer: JPEG/PNG up to 4 MB, preview, replacement/removal, pending/error feedback. Original pixel dimensions retained, EXIF orientation applied, metadata stripped, no cropping. Input safety limit: 40 million pixels, no animation, full decoding before storage.
- Guest session: random HttpOnly, SameSite cookie, seven-day lifetime; DB stores only its hash. Multipart POST requires the same origin and a per-fingerprint rate-limit check. Only visible published products or authenticated admin previews may accept uploads.
- Cart/draft: stores only an opaque upload UUID reference, never binary/base64 or signed URLs. Different photos make separate cart lines. Private thumbnails are shown in the cart.
- Checkout: verifies required fields, upload identity, ownership, product, field, existence and expiration on the server. An order trigger links the photo within the order transaction.
- Admin: per-item open/download links. Guests can access only their own unexpired files; administrators can access order files. Files live in a new private bucket, with 60-second signed URLs issued only after authorization. No public bucket URLs or private photo content are placed in order emails.
- Cleanup: protected daily cron removes up to 100 expired, unsubmitted files. Ordered photos remain until the order is deleted; their retention policy should be reviewed separately by the business. Deleting an order releases its photos for the expired-file cleanup.

## Verification

Targeted tests cover JSON acceptance/rejection, ownership, expiration, product/field binding, cart persistence/line separation, image decode/metadata stripping, and protected admin references. Release suite includes customer photo checks.

The user confirmed migration success and explicitly authorized disposable production-DB fixtures and their cleanup. Verified against Preview `https://vemidi-store-h5n0wpdwr-ve-mi-di.vercel.app/`:

- New table exists; bucket is private and allows JPEG/PNG only.
- Synthetic PNG successfully processed and stored, then fetched through the real owner-authorized route with byte equality.
- Anonymous route access, public bucket URL and anonymous metadata reads denied.
- Real checkout verification helper accepts matching owner/product/field and rejects another owner.
- Expired photo rejected by both the download route and the order trigger; failed order insert rolled back.
- Valid photo attached atomically to an explicitly cancelled disposable order; saved snapshot and admin reference verified.
- No notification delivery queued and no emails sent.
- Test orders, photo metadata, storage object and unpublished product removed. Absence of all test DB records verified.

The real multipart POST UI and final checkout form have not been submitted against a published product; their component interactions were tested with isolated mocked requests. The fixture test deliberately kept its product unpublished and used direct order insertion to avoid publication and notifications. Authenticated administrator download still needs a normal browser acceptance check. This feature remains Preview-only, not deployed to production.

References consulted: https://supabase.com/docs/guides/storage/serving/downloads and https://sharp.pixelplumbing.com/api-constructor/.
