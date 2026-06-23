import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("site media actions use hero profile upload pipeline", () => {
  const source = readFileSync(
    new URL("../app/admin/site-media-actions.ts", import.meta.url),
    "utf8",
  );

  assert.match(
    source,
    /processAndUploadImages\(\s*supabase,\s*HERO_PROFILE,\s*SITE_MEDIA_SCOPE_ID,/,
  );
  assert.match(source, /validateImageUploadBatch\(HERO_PROFILE,/);
  assert.match(source, /const HERO_PROFILE = "hero" as const;/);
});

test("site media actions validate keys against SITE_MEDIA_KEYS", () => {
  const source = readFileSync(
    new URL("../app/admin/site-media-actions.ts", import.meta.url),
    "utf8",
  );

  assert.match(source, /SITE_MEDIA_KEYS/);
  assert.match(source, /isValidSiteMediaKey\(key\)/);
  assert.match(source, /Невалиден ключ за изображение/);
});

test("site media actions delete old storage on replace and clear", () => {
  const source = readFileSync(
    new URL("../app/admin/site-media-actions.ts", import.meta.url),
    "utf8",
  );

  assert.match(source, /getProductImagePath/);
  assert.match(source, /deleteProductImage/);
  assert.match(source, /deleteStoredImageBestEffort/);
  assert.match(
    source,
    /await deleteStoredImageBestEffort\(supabase, existing\?\.image_url\)/,
  );
  assert.match(
    source,
    /await deleteStoredImageBestEffort\(supabase, existing\.image_url\)/,
  );
});

test("site media actions revalidate storefront paths and redirect to content tab", () => {
  const source = readFileSync(
    new URL("../app/admin/site-media-actions.ts", import.meta.url),
    "utf8",
  );

  assert.match(source, /function revalidateSiteMediaPaths\(\)/);
  assert.match(source, /revalidatePath\("\/producti"\)/);
  assert.match(source, /revalidatePath\("\/thank-you"\)/);
  assert.match(source, /revalidateSiteMediaPaths\(\)/);
  assert.match(source, /const ADMIN_CONTENT_PATH = "\/admin\?tab=content"/);
  assert.match(source, /redirect\(`\$\{ADMIN_CONTENT_PATH\}&\$\{kind\}=/);
});

test("site media form fields are defined for admin panel", () => {
  const source = readFileSync(
    new URL("../lib/admin/form-fields.ts", import.meta.url),
    "utf8",
  );

  assert.match(source, /siteMedia:\s*\{/);
  assert.match(source, /key:\s*"site_media_key"/);
  assert.match(source, /imageFile:\s*"site_media_image_file"/);
  assert.match(source, /imageAlt:\s*"site_media_image_alt"/);
});

test("admin content tab renders site media management panel", () => {
  const source = readFileSync(
    new URL("../app/admin/page.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /SiteMediaManagementPanel/);
  assert.match(source, /\.from\("site_media"\)/);
});
