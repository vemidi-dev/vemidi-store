import type { CookieConsentPreferences } from "@/lib/consent/types";

export type GoogleConsentModeValue = "granted" | "denied";

export type GoogleConsentModeState = {
  analytics_storage: GoogleConsentModeValue;
  ad_storage: GoogleConsentModeValue;
  ad_user_data: GoogleConsentModeValue;
  ad_personalization: GoogleConsentModeValue;
};

/** Phase 3: marketing consent maps to Google ad_* Consent Mode keys. */
export const GOOGLE_MARKETING_CONSENT_ENABLED = true;

export const GOOGLE_CONSENT_MODE_DEFAULT: GoogleConsentModeState = {
  analytics_storage: "denied",
  ad_storage: "denied",
  ad_user_data: "denied",
  ad_personalization: "denied",
};

export function getGaMeasurementId(): string | undefined {
  const measurementId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID?.trim();
  return measurementId || undefined;
}

export function mapPreferencesToGoogleConsentMode(
  preferences: Pick<CookieConsentPreferences, "analytics" | "marketing">,
): GoogleConsentModeState {
  const marketingGranted =
    GOOGLE_MARKETING_CONSENT_ENABLED && preferences.marketing === true;

  return {
    analytics_storage: preferences.analytics ? "granted" : "denied",
    ad_storage: marketingGranted ? "granted" : "denied",
    ad_user_data: marketingGranted ? "granted" : "denied",
    ad_personalization: marketingGranted ? "granted" : "denied",
  };
}

export function shouldLoadGoogleAnalytics(
  preferences: CookieConsentPreferences | null,
  measurementId: string | undefined = getGaMeasurementId(),
): boolean {
  return Boolean(measurementId && preferences?.analytics === true);
}
