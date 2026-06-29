"use client";

import { useCookieConsent } from "@/components/consent/cookie-consent-provider";

export function CookieConsentFooterTrigger() {
  const { openSettings } = useCookieConsent();

  return (
    <button
      type="button"
      onClick={openSettings}
      className="text-left text-sm text-boutique-muted transition hover:text-boutique-rose-deep"
    >
      Настройки на бисквитките
    </button>
  );
}
