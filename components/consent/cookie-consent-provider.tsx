"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { CookieConsentBanner } from "@/components/consent/cookie-consent-banner";
import { CookieConsentSettingsDialog } from "@/components/consent/cookie-consent-settings-dialog";
import { GoogleAnalyticsConsentLoader } from "@/components/consent/google-analytics-consent-loader";
import { MetaPixelConsentLoader } from "@/components/consent/meta-pixel-consent-loader";
import {
  buildAcceptAllPreferences,
  buildRejectAllPreferences,
  normalizePreferences,
  readStoredConsentFromStorage,
  writeStoredConsentToStorage,
} from "@/lib/consent/storage";
import type { CookieConsentPreferences } from "@/lib/consent/types";

type CookieConsentContextValue = {
  ready: boolean;
  hasConsent: boolean;
  preferences: CookieConsentPreferences | null;
  openSettings: () => void;
};

const CookieConsentContext = createContext<CookieConsentContextValue | null>(
  null,
);

export function useCookieConsent() {
  const context = useContext(CookieConsentContext);

  if (!context) {
    throw new Error("useCookieConsent must be used within CookieConsentProvider");
  }

  return context;
}

type CookieConsentProviderProps = {
  children: ReactNode;
};

export function CookieConsentProvider({ children }: CookieConsentProviderProps) {
  const [ready, setReady] = useState(false);
  const [hasConsent, setHasConsent] = useState(false);
  const [preferences, setPreferences] =
    useState<CookieConsentPreferences | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [draft, setDraft] = useState<
    Pick<CookieConsentPreferences, "analytics" | "marketing">
  >({
    analytics: false,
    marketing: false,
  });

  useEffect(() => {
    const stored = readStoredConsentFromStorage(window.localStorage);

    if (stored) {
      setPreferences(stored.preferences);
      setHasConsent(true);
      setDraft({
        analytics: stored.preferences.analytics,
        marketing: stored.preferences.marketing,
      });
    }

    setReady(true);
  }, []);

  const persistPreferences = useCallback(
    (nextPreferences: CookieConsentPreferences) => {
      const stored = writeStoredConsentToStorage(
        window.localStorage,
        nextPreferences,
      );

      setPreferences(stored.preferences);
      setHasConsent(true);
      setDraft({
        analytics: stored.preferences.analytics,
        marketing: stored.preferences.marketing,
      });
      setSettingsOpen(false);
    },
    [],
  );

  const openSettings = useCallback(() => {
    setDraft({
      analytics: preferences?.analytics ?? false,
      marketing: preferences?.marketing ?? false,
    });
    setSettingsOpen(true);
  }, [preferences]);

  const closeSettings = useCallback(() => {
    setSettingsOpen(false);
  }, []);

  const acceptAll = useCallback(() => {
    persistPreferences(buildAcceptAllPreferences());
  }, [persistPreferences]);

  const rejectAll = useCallback(() => {
    persistPreferences(buildRejectAllPreferences());
  }, [persistPreferences]);

  const saveDraft = useCallback(() => {
    persistPreferences(normalizePreferences(draft));
  }, [draft, persistPreferences]);

  const contextValue = useMemo(
    () => ({
      ready,
      hasConsent,
      preferences,
      openSettings,
    }),
    [ready, hasConsent, preferences, openSettings],
  );

  const bannerVisible = ready && !hasConsent && !settingsOpen;

  return (
    <CookieConsentContext.Provider value={contextValue}>
      {children}
      {bannerVisible ? (
        <CookieConsentBanner
          onAcceptAll={acceptAll}
          onRejectAll={rejectAll}
          onOpenSettings={openSettings}
        />
      ) : null}
      <CookieConsentSettingsDialog
        open={settingsOpen}
        draft={draft}
        onDraftChange={setDraft}
        onSave={saveDraft}
        onClose={closeSettings}
      />
      <GoogleAnalyticsConsentLoader />
      <MetaPixelConsentLoader />
    </CookieConsentContext.Provider>
  );
}
