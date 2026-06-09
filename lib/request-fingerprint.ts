import "server-only";

import { createHmac } from "node:crypto";
import { headers } from "next/headers";

export async function getRequestFingerprint(scope: string) {
  const requestHeaders = await headers();
  const forwardedFor = requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim();
  const networkAddress = forwardedFor || requestHeaders.get("x-real-ip") || "unknown";
  const userAgent = requestHeaders.get("user-agent")?.slice(0, 300) || "unknown";
  const secret =
    process.env.CHECKOUT_RATE_LIMIT_SECRET?.trim() ||
    process.env.SUPABASE_SECRET_KEY?.trim() ||
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!secret) return null;

  return createHmac("sha256", secret)
    .update(`${scope}\n${networkAddress}\n${userAgent}`)
    .digest("hex");
}
