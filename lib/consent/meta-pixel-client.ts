import { readStoredConsentFromStorage } from "@/lib/consent/storage";
import type { CookieConsentPreferences } from "@/lib/consent/types";
import {
  buildMetaAddToCartPayload,
  buildMetaInitiateCheckoutPayload,
  buildMetaPurchasePayload,
  buildMetaViewContentPayload,
  getMetaPixelId,
  shouldLoadMetaPixel,
  type MetaPixelEcommercePayload,
  type MetaPixelPurchasePayload,
} from "@/lib/consent/meta-pixel";
import type { PurchaseAnalyticsPayload } from "@/lib/checkout/order-confirmation";

declare global {
  interface Window {
    fbq?: {
      (...args: unknown[]): void;
      callMethod?: (...args: unknown[]) => void;
      queue?: unknown[];
      loaded?: boolean;
      version?: string;
    };
    _fbq?: Window["fbq"];
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

function trackMetaPixel(
  eventName: string,
  payload?: MetaPixelEcommercePayload | MetaPixelPurchasePayload,
  preferences?: CookieConsentPreferences | null,
) {
  if (typeof window === "undefined" || typeof window.fbq !== "function") {
    return;
  }

  const resolvedPreferences = resolvePreferences(preferences);
  const pixelId = getMetaPixelId();

  if (!shouldLoadMetaPixel(resolvedPreferences, pixelId)) {
    return;
  }

  if (payload) {
    window.fbq("track", eventName, payload);
    return;
  }

  window.fbq("track", eventName);
}

export function ensureMetaPixelScript(pixelId: string) {
  if (typeof document === "undefined") {
    return;
  }

  const selector = `script[data-vemidi-meta-pixel-loader="${pixelId}"]`;

  if (document.querySelector(selector)) {
    return;
  }

  if (typeof window.fbq !== "function") {
    const fbq = function (...args: unknown[]) {
      if (fbq.callMethod) {
        fbq.callMethod(...args);
        return;
      }

      fbq.queue?.push(args);
    } as NonNullable<Window["fbq"]>;

    fbq.queue = [];
    fbq.loaded = true;
    fbq.version = "2.0";
    window.fbq = fbq;
    window._fbq = fbq;
  }

  const script = document.createElement("script");
  script.async = true;
  script.src = "https://connect.facebook.net/en_US/fbevents.js";
  script.setAttribute("data-vemidi-meta-pixel-loader", pixelId);
  document.head.appendChild(script);
}

export function initMetaPixel(pixelId: string) {
  if (typeof window.fbq !== "function") {
    return;
  }

  window.fbq("init", pixelId);
}

export function trackMetaPageView(preferences?: CookieConsentPreferences | null) {
  trackMetaPixel("PageView", undefined, preferences);
}

export function trackMetaViewContent(
  input: Parameters<typeof buildMetaViewContentPayload>[0],
  preferences?: CookieConsentPreferences | null,
) {
  trackMetaPixel(
    "ViewContent",
    buildMetaViewContentPayload(input),
    preferences,
  );
}

export function trackMetaAddToCart(
  input: Parameters<typeof buildMetaAddToCartPayload>[0],
  preferences?: CookieConsentPreferences | null,
) {
  trackMetaPixel(
    "AddToCart",
    buildMetaAddToCartPayload(input),
    preferences,
  );
}

export function trackMetaInitiateCheckout(
  input: Parameters<typeof buildMetaInitiateCheckoutPayload>[0],
  preferences?: CookieConsentPreferences | null,
) {
  trackMetaPixel(
    "InitiateCheckout",
    buildMetaInitiateCheckoutPayload(input),
    preferences,
  );
}

export function trackMetaPurchase(
  purchase: PurchaseAnalyticsPayload,
  preferences?: CookieConsentPreferences | null,
) {
  trackMetaPixel(
    "Purchase",
    buildMetaPurchasePayload(purchase),
    preferences,
  );
}
