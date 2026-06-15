import type { SupabaseClient } from "@supabase/supabase-js";

import { WITHDRAWAL_RATE_LIMIT } from "@/lib/withdrawal/constants";

export type WithdrawalRateLimitDecision =
  | { kind: "allow" }
  | { kind: "deny" }
  | { kind: "bypass" };

export async function checkWithdrawalRateLimit(
  supabase: SupabaseClient | null,
  clientKey: string | null,
): Promise<WithdrawalRateLimitDecision> {
  if (!supabase || !clientKey) {
    return { kind: "bypass" };
  }

  const { data, error } = await supabase.rpc("check_store_checkout_rate_limit", {
    p_client_key: clientKey,
    p_limit: WITHDRAWAL_RATE_LIMIT.limit,
    p_window_seconds: WITHDRAWAL_RATE_LIMIT.windowSeconds,
  });

  if (error) {
    console.error("Withdrawal rate-limit check failed", {
      code: error.code,
      message: error.message,
    });
    return { kind: "bypass" };
  }

  if (data === true) {
    return { kind: "allow" };
  }

  return { kind: "deny" };
}
