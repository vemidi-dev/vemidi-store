import assert from "node:assert/strict";
import test from "node:test";

import { checkWithdrawalRateLimit } from "@/lib/withdrawal/withdrawal-rate-limit";

test("checkWithdrawalRateLimit bypasses when RPC storage fails", async () => {
  const supabase = {
    rpc: async () => ({ data: null, error: { code: "XX000", message: "db down" } }),
  };

  const decision = await checkWithdrawalRateLimit(supabase as never, "client-key");
  assert.equal(decision.kind, "bypass");
});

test("checkWithdrawalRateLimit denies when limit exceeded", async () => {
  const supabase = {
    rpc: async () => ({ data: false, error: null }),
  };

  const decision = await checkWithdrawalRateLimit(supabase as never, "client-key");
  assert.equal(decision.kind, "deny");
});

test("checkWithdrawalRateLimit allows when under limit", async () => {
  const supabase = {
    rpc: async () => ({ data: true, error: null }),
  };

  const decision = await checkWithdrawalRateLimit(supabase as never, "client-key");
  assert.equal(decision.kind, "allow");
});

test("checkWithdrawalRateLimit bypasses when client key missing", async () => {
  const decision = await checkWithdrawalRateLimit({} as never, null);
  assert.equal(decision.kind, "bypass");
});
