"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

import { useCookieConsent } from "@/components/consent/cookie-consent-provider";
import {
  ensureMetaPixelScript,
  initMetaPixel,
  trackMetaPageView,
} from "@/lib/consent/meta-pixel-client";
import { getMetaPixelId, shouldLoadMetaPixel } from "@/lib/consent/meta-pixel";

export function MetaPixelConsentLoader() {
  const pathname = usePathname();
  const { ready, preferences } = useCookieConsent();
  const pixelId = getMetaPixelId();
  const pixelInitializedRef = useRef(false);
  const lastPagePathRef = useRef<string | null>(null);

  useEffect(() => {
    if (!ready || !pixelId) {
      pixelInitializedRef.current = false;
      lastPagePathRef.current = null;
      return;
    }

    if (!shouldLoadMetaPixel(preferences, pixelId)) {
      pixelInitializedRef.current = false;
      lastPagePathRef.current = null;
      return;
    }

    ensureMetaPixelScript(pixelId);

    if (!pixelInitializedRef.current) {
      initMetaPixel(pixelId);
      pixelInitializedRef.current = true;
    }
  }, [ready, preferences, pixelId]);

  useEffect(() => {
    if (
      !ready ||
      !pixelId ||
      !pixelInitializedRef.current ||
      !shouldLoadMetaPixel(preferences, pixelId)
    ) {
      return;
    }

    const pagePath = `${pathname}${window.location.search}`;

    if (lastPagePathRef.current === pagePath) {
      return;
    }

    lastPagePathRef.current = pagePath;
    trackMetaPageView(preferences);
  }, [ready, preferences, pixelId, pathname]);

  return null;
}
