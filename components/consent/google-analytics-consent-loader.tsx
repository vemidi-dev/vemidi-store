"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

import { useCookieConsent } from "@/components/consent/cookie-consent-provider";
import {
  getGaMeasurementId,
  mapPreferencesToGoogleConsentMode,
  shouldLoadGoogleAnalytics,
} from "@/lib/consent/google-consent-mode";

declare global {
  interface Window {
    dataLayer?: Array<Record<string, unknown>>;
    gtag?: (...args: unknown[]) => void;
  }
}

function updateGoogleConsent(
  preferences: Parameters<typeof mapPreferencesToGoogleConsentMode>[0],
) {
  if (typeof window.gtag !== "function") {
    return;
  }

  window.gtag(
    "consent",
    "update",
    mapPreferencesToGoogleConsentMode(preferences),
  );
}

function ensureGtagScript(measurementId: string) {
  const selector = `script[data-vemidi-ga-loader="${measurementId}"]`;

  if (document.querySelector(selector)) {
    return;
  }

  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
  script.setAttribute("data-vemidi-ga-loader", measurementId);
  document.head.appendChild(script);
}

function configureGoogleAnalytics(measurementId: string) {
  window.gtag?.("js", new Date());
  window.gtag?.("config", measurementId, {
    send_page_view: false,
  });
}

function sendGoogleAnalyticsPageView(measurementId: string, pagePath: string) {
  window.gtag?.("event", "page_view", {
    page_path: pagePath,
    send_to: measurementId,
  });
}

export function GoogleAnalyticsConsentLoader() {
  const pathname = usePathname();
  const { ready, preferences } = useCookieConsent();
  const measurementId = getGaMeasurementId();
  const gaConfiguredRef = useRef(false);
  const lastPagePathRef = useRef<string | null>(null);

  useEffect(() => {
    if (!ready || typeof window.gtag !== "function") {
      return;
    }

    if (preferences) {
      updateGoogleConsent(preferences);
    }

    if (!measurementId || !shouldLoadGoogleAnalytics(preferences, measurementId)) {
      gaConfiguredRef.current = false;
      lastPagePathRef.current = null;
      return;
    }

    ensureGtagScript(measurementId);

    if (!gaConfiguredRef.current) {
      configureGoogleAnalytics(measurementId);
      gaConfiguredRef.current = true;
    }
  }, [ready, preferences, measurementId]);

  useEffect(() => {
    if (
      !ready ||
      !measurementId ||
      !gaConfiguredRef.current ||
      !shouldLoadGoogleAnalytics(preferences, measurementId)
    ) {
      return;
    }

    const pagePath = `${pathname}${window.location.search}`;

    if (lastPagePathRef.current === pagePath) {
      return;
    }

    lastPagePathRef.current = pagePath;
    sendGoogleAnalyticsPageView(measurementId, pagePath);
  }, [ready, preferences, measurementId, pathname]);

  return null;
}
