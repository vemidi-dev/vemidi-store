export const CAMPAIGN_HANDOFF_COOKIE_NAME = "vemidi_campaign_handoff";
export const CAMPAIGN_HANDOFF_COOKIE_PATH = "/campaign-checkout";
export const CAMPAIGN_HANDOFF_COOKIE_MAX_AGE_SECONDS = 300;

export function isCampaignHandoffSecureRequest(input: {
  headers: Pick<Headers, "get">;
  url: string;
}) {
  if (input.headers.get("x-forwarded-proto") === "https") {
    return true;
  }

  try {
    return new URL(input.url).protocol === "https:";
  } catch {
    return false;
  }
}

export function buildCampaignHandoffSetCookieHeader(sealed: string, secure: boolean) {
  const parts = [
    `${CAMPAIGN_HANDOFF_COOKIE_NAME}=${sealed}`,
    "HttpOnly",
    "SameSite=Lax",
    `Path=${CAMPAIGN_HANDOFF_COOKIE_PATH}`,
    `Max-Age=${CAMPAIGN_HANDOFF_COOKIE_MAX_AGE_SECONDS}`,
  ];

  if (secure) {
    parts.push("Secure");
  }

  return parts.join("; ");
}

export function buildCampaignHandoffClearCookieHeader(secure: boolean) {
  const parts = [
    `${CAMPAIGN_HANDOFF_COOKIE_NAME}=`,
    "HttpOnly",
    "SameSite=Lax",
    `Path=${CAMPAIGN_HANDOFF_COOKIE_PATH}`,
    "Max-Age=0",
  ];

  if (secure) {
    parts.push("Secure");
  }

  return parts.join("; ");
}
