# Archive event gallery compression

## Cause and change

The archive gallery uploaded original files directly to a Server Action. File-size and input-pixel limits could reject phone photos before server-side optimization, and a multi-photo request could exceed Vercel's transport limit.

- Added client-side sequential preparation only to the "Галерия от минали събития" upload form.
- PNG/JPEG/WebP originals up to 50 MB each, existing maximum 12 per upload. Existing gallery capacity remains 30.
- Resize to at most 1400 pixels on the long edge, preserve aspect ratio and transparency, encode genuine WebP starting at quality 77. Lower quality/dimensions if needed to cap each prepared photo at 250 KiB, bounding twelve photos below 3.3 MiB with normal form metadata.
- Already-small files are not enlarged or unnecessarily re-encoded. Output WebP files have matching MIME type and extension.
- Archive profile now accepts low-resolution photos instead of requiring a 500px short edge. Product, blog, category and hero profiles are unchanged. Server signature checks, input-pixel limits, storage paths and gallery capacity validation remain in place.
- Pending state includes compression and upload, prevents duplicate submissions and warns before leaving. Preparation/network errors retain chosen files and alt text; retry stays enabled. No silent fallback to uploading uncompressed oversized files.
- Main workshop/hero image preparation is unchanged. Existing stored gallery photos are not modified.

## Verification

- Scoped compression + image-profile tests: 17/17 passed; TypeScript and scoped ESLint passed.
- Browser/Edge tested actual form submission while intercepting/aborting all POSTs before the server: noisy PNG 23,083,275 bytes compressed to 228,202-byte genuine WebP at 1120x840. Twelve noisy photos produced a 3,029,484-byte multipart request.
- Verified source file/name and alt text survive a failed network request, retry remains enabled, small 320x240 image is not upscaled, corrupt image never reaches the network, and mobile has no horizontal overflow.
- No real photos uploaded and no real gallery rows modified by tests. Temporary test files/routes removed.

No additional SQL migration is required. Production and Git release wait for user acceptance of Preview.

Preview: https://vemidi-store-mnqhx73zl-ve-mi-di.vercel.app (`dpl_DR9Vem7NuqVPqZrrVmC4djS37bd2`), remote build/deployment completed. Full `npm run test:release` passed. Admin smoke redirects to login (307).
