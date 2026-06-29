import type {
  CookieConsentPreferences,
  StoredCookieConsent,
} from "@/lib/consent/types";

/**
 * Consent is stored in localStorage (same first-party pattern as the cart).
 * No third-party cookie is set in Phase 1; GA4 loads in Phase 2 when analytics consent is granted.
 */
export const COOKIE_CONSENT_STORAGE_KEY = "vemidi_cookie_consent";
export const COOKIE_CONSENT_VERSION = 1;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function normalizePreferences(
  input: Partial<Pick<CookieConsentPreferences, "analytics" | "marketing">> = {},
): CookieConsentPreferences {
  return {
    necessary: true,
    analytics: input.analytics === true,
    marketing: input.marketing === true,
  };
}

export function buildAcceptAllPreferences(): CookieConsentPreferences {
  return {
    necessary: true,
    analytics: true,
    marketing: true,
  };
}

export function buildRejectAllPreferences(): CookieConsentPreferences {
  return normalizePreferences();
}

export function serializeStoredConsent(
  preferences: CookieConsentPreferences,
  updatedAt = new Date().toISOString(),
): string {
  const payload: StoredCookieConsent = {
    version: COOKIE_CONSENT_VERSION,
    preferences: normalizePreferences(preferences),
    updatedAt,
  };

  return JSON.stringify(payload);
}

export function parseStoredConsent(
  raw: string | null | undefined,
): StoredCookieConsent | null {
  if (!raw) {
    return null;
  }

  try {
    const parsed: unknown = JSON.parse(raw);

    if (!isRecord(parsed)) {
      return null;
    }

    if (parsed.version !== COOKIE_CONSENT_VERSION) {
      return null;
    }

    if (!isRecord(parsed.preferences)) {
      return null;
    }

    const analytics = parsed.preferences.analytics === true;
    const marketing = parsed.preferences.marketing === true;

    if (typeof parsed.updatedAt !== "string" || !parsed.updatedAt.trim()) {
      return null;
    }

    return {
      version: COOKIE_CONSENT_VERSION,
      preferences: {
        necessary: true,
        analytics,
        marketing,
      },
      updatedAt: parsed.updatedAt,
    };
  } catch {
    return null;
  }
}

export function readStoredConsentFromStorage(
  storage: Pick<Storage, "getItem">,
): StoredCookieConsent | null {
  return parseStoredConsent(storage.getItem(COOKIE_CONSENT_STORAGE_KEY));
}

export function writeStoredConsentToStorage(
  storage: Pick<Storage, "setItem">,
  preferences: CookieConsentPreferences,
): StoredCookieConsent {
  const stored = {
    version: COOKIE_CONSENT_VERSION,
    preferences: normalizePreferences(preferences),
    updatedAt: new Date().toISOString(),
  };

  storage.setItem(
    COOKIE_CONSENT_STORAGE_KEY,
    JSON.stringify(stored),
  );

  return stored;
}
