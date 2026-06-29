import assert from "node:assert/strict";
import test from "node:test";

import {
  GOOGLE_CONSENT_MODE_DEFAULT,
  GOOGLE_MARKETING_CONSENT_ENABLED,
  mapPreferencesToGoogleConsentMode,
  shouldLoadGoogleAnalytics,
} from "@/lib/consent/google-consent-mode";
import { buildAcceptAllPreferences, normalizePreferences } from "@/lib/consent/storage";

test("default Google Consent Mode state is fully denied", () => {
  assert.deepEqual(GOOGLE_CONSENT_MODE_DEFAULT, {
    analytics_storage: "denied",
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied",
  });
});

test("analytics consent grants only analytics_storage when marketing is off", () => {
  assert.deepEqual(
    mapPreferencesToGoogleConsentMode(
      normalizePreferences({ analytics: true, marketing: false }),
    ),
    {
      analytics_storage: "granted",
      ad_storage: "denied",
      ad_user_data: "denied",
      ad_personalization: "denied",
    },
  );
});

test("marketing consent grants Google ad keys in phase 3", () => {
  assert.equal(GOOGLE_MARKETING_CONSENT_ENABLED, true);

  assert.deepEqual(
    mapPreferencesToGoogleConsentMode(
      normalizePreferences({ analytics: false, marketing: true }),
    ),
    {
      analytics_storage: "denied",
      ad_storage: "granted",
      ad_user_data: "granted",
      ad_personalization: "granted",
    },
  );
});

test("accept all grants analytics and marketing Google consent keys", () => {
  assert.deepEqual(
    mapPreferencesToGoogleConsentMode(buildAcceptAllPreferences()),
    {
      analytics_storage: "granted",
      ad_storage: "granted",
      ad_user_data: "granted",
      ad_personalization: "granted",
    },
  );
});

test("reject all maps to denied Google consent state", () => {
  assert.deepEqual(
    mapPreferencesToGoogleConsentMode(normalizePreferences()),
    GOOGLE_CONSENT_MODE_DEFAULT,
  );
});

test("shouldLoadGoogleAnalytics requires analytics consent and measurement ID", () => {
  assert.equal(
    shouldLoadGoogleAnalytics(
      normalizePreferences({ analytics: true }),
      "G-BRJYG0WKXF",
    ),
    true,
  );
  assert.equal(
    shouldLoadGoogleAnalytics(
      normalizePreferences({ analytics: false }),
      "G-BRJYG0WKXF",
    ),
    false,
  );
  assert.equal(
    shouldLoadGoogleAnalytics(normalizePreferences({ analytics: true }), ""),
    false,
  );
  assert.equal(shouldLoadGoogleAnalytics(null, "G-BRJYG0WKXF"), false);
});
