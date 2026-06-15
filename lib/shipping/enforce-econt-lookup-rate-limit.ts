import "server-only";

import { getRequestFingerprint } from "@/lib/request-fingerprint";
import { createServiceClient } from "@/lib/supabase/service";
import { checkEcontLookupRateLimit, ECONT_LOOKUP_RATE_LIMIT } from "@/lib/shipping/econt-rate-limit";

export async function enforceEcontLookupRateLimit() {
  const supabase = createServiceClient();
  const clientKey = await getRequestFingerprint(ECONT_LOOKUP_RATE_LIMIT.scope);
  const decision = await checkEcontLookupRateLimit(supabase, clientKey);

  return { decision, clientKey, supabase };
}
