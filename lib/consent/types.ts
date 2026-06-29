export type ConsentCategory = "necessary" | "analytics" | "marketing";

export type CookieConsentPreferences = {
  necessary: true;
  analytics: boolean;
  marketing: boolean;
};

export type StoredCookieConsent = {
  version: number;
  preferences: CookieConsentPreferences;
  updatedAt: string;
};
