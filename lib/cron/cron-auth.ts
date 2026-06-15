export function getCronSecret() {
  return process.env.CRON_SECRET?.trim() ?? "";
}

export function isCronAuthorized(request: Request, secret = getCronSecret()) {
  if (!secret) {
    return false;
  }

  const authorization = request.headers.get("authorization")?.trim() ?? "";
  return authorization === `Bearer ${secret}`;
}

/** Returns 401 when auth fails; null when the request may proceed. */
export function getCronAuthFailureStatus(request: Request): 401 | null {
  return isCronAuthorized(request) ? null : 401;
}
