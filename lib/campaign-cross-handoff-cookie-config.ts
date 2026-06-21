export const CROSS_HANDOFF_COOKIE_NAME = "vemidi_cross_handoff";
export const CROSS_HANDOFF_COOKIE_PATH = "/";
export const CROSS_HANDOFF_PREVIEW_COOKIE_PATH = "/api/campaign-landing-handoff";
export const CROSS_HANDOFF_COOKIE_MAX_AGE_SECONDS = 300;
export const CROSS_HANDOFF_COOKIE_DOMAIN = ".vemidi-crafts.com";

export function isCrossHandoffSecureRequest(input: {
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

export function shouldUseCrossHandoffParentDomain(hostname: string) {
  const normalized = hostname.trim().toLowerCase();
  return (
    normalized === "vemidi-crafts.com" || normalized.endsWith(".vemidi-crafts.com")
  );
}

type CrossHandoffCookieScope = {
  useParentDomain: boolean;
  path: string;
};

export function resolveCrossHandoffCookieScope(hostname: string): CrossHandoffCookieScope {
  if (shouldUseCrossHandoffParentDomain(hostname)) {
    return {
      useParentDomain: true,
      path: CROSS_HANDOFF_COOKIE_PATH,
    };
  }

  return {
    useParentDomain: false,
    path: CROSS_HANDOFF_PREVIEW_COOKIE_PATH,
  };
}

export function buildCrossHandoffSetCookieHeader(
  sealed: string,
  secure: boolean,
  scope: CrossHandoffCookieScope,
) {
  const parts = [
    `${CROSS_HANDOFF_COOKIE_NAME}=${sealed}`,
    "HttpOnly",
    "SameSite=Lax",
    `Path=${scope.path}`,
    `Max-Age=${CROSS_HANDOFF_COOKIE_MAX_AGE_SECONDS}`,
  ];

  if (scope.useParentDomain) {
    parts.push(`Domain=${CROSS_HANDOFF_COOKIE_DOMAIN}`);
  }

  if (secure) {
    parts.push("Secure");
  }

  return parts.join("; ");
}

export function buildCrossHandoffClearCookieHeader(
  secure: boolean,
  scope: CrossHandoffCookieScope,
) {
  const parts = [
    `${CROSS_HANDOFF_COOKIE_NAME}=`,
    "HttpOnly",
    "SameSite=Lax",
    `Path=${scope.path}`,
    "Max-Age=0",
  ];

  if (scope.useParentDomain) {
    parts.push(`Domain=${CROSS_HANDOFF_COOKIE_DOMAIN}`);
  }

  if (secure) {
    parts.push("Secure");
  }

  return parts.join("; ");
}
