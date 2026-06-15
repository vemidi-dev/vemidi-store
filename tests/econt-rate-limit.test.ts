import assert from "node:assert/strict";
import test from "node:test";

import {
  checkEcontLookupRateLimit,
  ECONT_LOOKUP_MAX_QUERY_LENGTH,
  ECONT_LOOKUP_RATE_LIMIT,
  normalizeEcontLookupQuery,
} from "@/lib/shipping/econt-rate-limit";

function createRateLimitSupabase(allowed: boolean | null, error: { code: string } | null = null) {
  return {
    rpc: async (
      name: string,
      args: { p_client_key: string; p_limit: number; p_window_seconds: number },
    ) => {
      assert.equal(name, "check_store_checkout_rate_limit");
      assert.equal(args.p_limit, ECONT_LOOKUP_RATE_LIMIT.limit);
      assert.equal(args.p_window_seconds, ECONT_LOOKUP_RATE_LIMIT.windowSeconds);
      assert.match(args.p_client_key, /^[0-9a-f]{64}$/);

      if (error) {
        return { data: null, error };
      }

      return { data: allowed, error: null };
    },
  };
}

test("checkEcontLookupRateLimit allows requests under the limit", async () => {
  const decision = await checkEcontLookupRateLimit(
    createRateLimitSupabase(true) as never,
    "a".repeat(64),
  );

  assert.equal(decision.kind, "allow");
});

test("checkEcontLookupRateLimit blocks requests over the limit", async () => {
  const decision = await checkEcontLookupRateLimit(
    createRateLimitSupabase(false) as never,
    "b".repeat(64),
  );

  assert.equal(decision.kind, "deny");
});

test("checkEcontLookupRateLimit bypasses when rpc errors", async () => {
  const decision = await checkEcontLookupRateLimit(
    createRateLimitSupabase(null, { code: "22023" }) as never,
    "c".repeat(64),
  );

  assert.equal(decision.kind, "bypass");
});

test("checkEcontLookupRateLimit bypasses when fingerprint prerequisites are missing", async () => {
  assert.deepEqual(await checkEcontLookupRateLimit(null, "d".repeat(64)), { kind: "bypass" });
  assert.deepEqual(await checkEcontLookupRateLimit(createRateLimitSupabase(true) as never, null), {
    kind: "bypass",
  });
});

test("normalizeEcontLookupQuery trims and caps query length", () => {
  const longQuery = "софия".repeat(20);
  const normalized = normalizeEcontLookupQuery(`  ${longQuery}  `);

  assert.equal(normalized.length, ECONT_LOOKUP_MAX_QUERY_LENGTH);
  assert.equal(normalized.endsWith(" "), false);
});
