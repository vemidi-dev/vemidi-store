import assert from "node:assert/strict";
import test from "node:test";

import { buildLlmsTxt } from "@/lib/seo/llms-txt";

test("llms.txt includes key public pages, address, and excludes private routes", () => {
  const siteUrl = new URL("https://vemidi-store.vercel.app");
  const body = buildLlmsTxt(siteUrl);

  assert.match(body, /^# VeMiDi crafts/m);
  assert.match(body, /\/sitemap\.xml/);
  assert.match(body, /\/robots\.txt/);
  assert.match(body, /\/produkti/);
  assert.match(body, /ж\.к\. Младост 2, бл\.210, вх\.3, София/);

  assert.doesNotMatch(body, /\/admin/);
  assert.doesNotMatch(body, /\/checkout/);
  assert.doesNotMatch(body, /\/cart/);
  assert.doesNotMatch(body, /\/account/);
});
