import type { PurchaseAnalyticsPayload } from "@/lib/checkout/order-confirmation";
import { readStoredConsentFromStorage } from "@/lib/consent/storage";
import type { CookieConsentPreferences } from "@/lib/consent/types";
import {
  getGaMeasurementId,
  shouldLoadGoogleAnalytics,
} from "@/lib/consent/google-consent-mode";

export type GaPurchaseEventParams = {
  value: number;
  currency: string;
  num_items: number;
};

export function buildGaPurchaseParams(
  purchase: PurchaseAnalyticsPayload,
): GaPurchaseEventParams {
  return {
    value: purchase.value,
    currency: purchase.currency,
    num_items: purchase.itemCount,
  };
}

export function canSendGaPurchaseEvent(
  preferences: CookieConsentPreferences | null,
  measurementId: string | undefined = getGaMeasurementId(),
  gtagAvailable = false,
): boolean {
  return shouldLoadGoogleAnalytics(preferences, measurementId) && gtagAvailable;
}

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

function resolvePreferences(
  preferences?: CookieConsentPreferences | null,
): CookieConsentPreferences | null {
  if (preferences) {
    return preferences;
  }

  if (typeof window === "undefined") {
    return null;
  }

  return readStoredConsentFromStorage(window.localStorage)?.preferences ?? null;
}

export function trackGaPurchase(
  purchase: PurchaseAnalyticsPayload,
  preferences?: CookieConsentPreferences | null,
) {
  if (typeof window === "undefined" || typeof window.gtag !== "function") {
    return;
  }

  const measurementId = getGaMeasurementId();
  const resolvedPreferences = resolvePreferences(preferences);

  if (!canSendGaPurchaseEvent(resolvedPreferences, measurementId, true)) {
    return;
  }

  window.gtag("event", "purchase", {
    ...buildGaPurchaseParams(purchase),
    send_to: measurementId,
  });
}
