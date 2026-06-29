import assert from "node:assert/strict";
import test from "node:test";

import {
  buildSmokeChecks,
  buildSmokeUrl,
  evaluateSmokeCheck,
  formatSmokeResultLine,
  normalizeBaseUrl,
  parseSmokePaths,
  resolveSmokeBaseUrl,
} from "@/lib/smoke-preview/checks";

test("normalizeBaseUrl strips trailing slash and keeps origin", () => {
  assert.equal(normalizeBaseUrl("https://preview.example.vercel.app/"), "https://preview.example.vercel.app");
});

test("buildSmokeUrl joins base URL and path", () => {
  assert.equal(
    buildSmokeUrl("https://preview.example.vercel.app", "/produkti"),
    "https://preview.example.vercel.app/produkti",
  );
});

test("resolveSmokeBaseUrl prefers CLI arg over env", () => {
  assert.equal(
    resolveSmokeBaseUrl(
      ["--base-url=https://from-arg.vercel.app"],
      { BASE_URL: "https://from-env.vercel.app" },
    ),
    "https://from-arg.vercel.app",
  );
});

test("parseSmokePaths splits comma-separated paths", () => {
  assert.deepEqual(parseSmokePaths("/categorii/pliko,/produkti/gift"), [
    "/categorii/pliko",
    "/produkti/gift",
  ]);
});

test("buildSmokeChecks appends custom paths without duplicates", () => {
  const checks = buildSmokeChecks(["/produkti", "/custom-page"]);
  assert.ok(checks.some((check) => check.path === "/custom-page"));
  assert.equal(checks.filter((check) => check.path === "/produkti").length, 1);
});

test("evaluateSmokeCheck rejects 5xx and validates body markers", () => {
  assert.equal(
    evaluateSmokeCheck({ path: "/", label: "Home" }, 500, "VeMiDi").ok,
    false,
  );

  assert.equal(
    evaluateSmokeCheck(
      { path: "/", label: "Home", bodyIncludesAny: ["VeMiDi"] },
      200,
      "<title>VeMiDi crafts</title>",
    ).ok,
    true,
  );

  assert.equal(
    evaluateSmokeCheck(
      { path: "/robots.txt", label: "robots", bodyIncludes: ["sitemap"] },
      200,
      "User-agent: *\nSitemap: https://example.com/sitemap.xml",
    ).ok,
    true,
  );
});

test("formatSmokeResultLine prefixes PASS or FAIL", () => {
  assert.match(
    formatSmokeResultLine("https://preview.example.vercel.app/", {
      ok: true,
      detail: "status 200",
    }),
    /^\[PASS\]/,
  );
  assert.match(
    formatSmokeResultLine("https://preview.example.vercel.app/checkout", {
      ok: false,
      detail: "status 500 (server error)",
    }),
    /^\[FAIL\]/,
  );
});
