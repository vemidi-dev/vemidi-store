import type { SupabaseClient } from "@supabase/supabase-js";

export const ECONT_LOOKUP_RATE_LIMIT = {
  scope: "econt-lookup",
  limit: 30,
  windowSeconds: 900,
} as const;

export const ECONT_LOOKUP_MAX_QUERY_LENGTH = 40;

export const ECONT_RATE_LIMIT_MESSAGE =
  "Направени са твърде много заявки. Опитайте отново след малко.";

export type EcontRateLimitDecision =
  | { kind: "allow" }
  | { kind: "deny" }
  | { kind: "bypass" };

export async function checkEcontLookupRateLimit(
  supabase: SupabaseClient | null,
  clientKey: string | null,
): Promise<EcontRateLimitDecision> {
  if (!supabase || !clientKey) {
    return { kind: "bypass" };
  }

  const { data, error } = await supabase.rpc("check_store_checkout_rate_limit", {
    p_client_key: clientKey,
    p_limit: ECONT_LOOKUP_RATE_LIMIT.limit,
    p_window_seconds: ECONT_LOOKUP_RATE_LIMIT.windowSeconds,
  });

  if (error) {
    console.error("Econt lookup rate-limit check failed", {
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

export function normalizeEcontLookupQuery(raw: string | null | undefined) {
  return String(raw ?? "").trim().slice(0, ECONT_LOOKUP_MAX_QUERY_LENGTH);
}
