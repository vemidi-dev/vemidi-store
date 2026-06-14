import assert from "node:assert/strict";
import test from "node:test";

import {
  sessionMiddlewareMatcher,
  shouldRefreshSupabaseSession,
} from "@/lib/middleware/session-routes";

test("shouldRefreshSupabaseSession covers admin, account and auth routes", () => {
  assert.equal(shouldRefreshSupabaseSession("/admin"), true);
  assert.equal(shouldRefreshSupabaseSession("/admin/login"), true);
  assert.equal(shouldRefreshSupabaseSession("/account"), true);
  assert.equal(shouldRefreshSupabaseSession("/account/orders"), true);
  assert.equal(shouldRefreshSupabaseSession("/auth/callback"), true);
  assert.equal(shouldRefreshSupabaseSession("/auth/reset-password"), true);
});

test("shouldRefreshSupabaseSession skips public storefront routes", () => {
  assert.equal(shouldRefreshSupabaseSession("/"), false);
  assert.equal(shouldRefreshSupabaseSession("/shop"), false);
  assert.equal(shouldRefreshSupabaseSession("/products/test-slug"), false);
  assert.equal(shouldRefreshSupabaseSession("/cart"), false);
  assert.equal(shouldRefreshSupabaseSession("/checkout"), false);
  assert.equal(shouldRefreshSupabaseSession("/thank-you"), false);
  assert.equal(shouldRefreshSupabaseSession("/privacy"), false);
});

test("sessionMiddlewareMatcher includes protected route patterns", () => {
  assert.ok(sessionMiddlewareMatcher.includes("/admin/:path*"));
  assert.ok(sessionMiddlewareMatcher.includes("/account"));
  assert.ok(sessionMiddlewareMatcher.includes("/account/:path*"));
  assert.ok(sessionMiddlewareMatcher.includes("/auth/:path*"));
});
