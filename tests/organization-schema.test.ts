import assert from "node:assert/strict";
import test from "node:test";

import {
  buildOrganizationSchema,
  buildSiteStructuredData,
  buildWebSiteSchema,
} from "@/lib/seo/organization-schema";
import { compactJsonLd } from "@/lib/seo/json-ld";

const siteUrl = new URL("https://vemidi-store.vercel.app");

test("organization schema includes real contact data and non-empty sameAs links", () => {
  const schema = buildOrganizationSchema(siteUrl);

  assert.equal(schema["@type"], "Organization");
  assert.equal(schema.name, "VeMiDi crafts");
  assert.equal(schema.url, siteUrl.origin);
  assert.equal(schema.email, "vemidi.crafts@gmail.com");
  assert.equal(schema.telephone, "+359895627631");
  assert.ok(Array.isArray(schema.sameAs));
  assert.ok(schema.sameAs!.length >= 3);
  assert.equal(schema.sameAs!.includes(""), false);
  assert.equal(schema.logo, `${siteUrl.origin}/assets/logo-transparent-color.png`);
});

test("website schema includes name and url", () => {
  const schema = buildWebSiteSchema(siteUrl);
  assert.equal(schema["@type"], "WebSite");
  assert.equal(schema.name, "VeMiDi crafts");
  assert.equal(schema.url, siteUrl.origin);
});

test("site structured data omits empty optional fields", () => {
  const payload = compactJsonLd(buildSiteStructuredData(siteUrl));
  const serialized = JSON.stringify(payload);

  assert.equal(serialized.includes("undefined"), false);
  assert.equal(serialized.includes("null"), false);
  assert.equal(Array.isArray(payload), true);
  assert.equal(payload.length, 2);
});
