import assert from "node:assert/strict";
import test from "node:test";

import { buildRobotsConfig } from "@/app/robots";

test("robots.txt disallows utility routes and keeps sitemap", () => {
  const siteUrl = new URL("https://vemidi-store.vercel.app");
  const robots = buildRobotsConfig(siteUrl);
  const rules = Array.isArray(robots.rules) ? robots.rules[0] : robots.rules;
  const disallow = rules.disallow ?? [];

  for (const path of [
    "/admin/",
    "/account",
    "/checkout",
    "/cart",
    "/thank-you",
    "/login",
    "/campaign-checkout",
    "/auth/",
  ]) {
    assert.ok(disallow.includes(path), `missing disallow for ${path}`);
  }

  assert.equal(robots.sitemap, `${siteUrl.origin}/sitemap.xml`);
  assert.equal(rules.allow, "/");
});
