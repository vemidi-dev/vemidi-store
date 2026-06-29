import assert from "node:assert/strict";
import test from "node:test";

import {
  COOKIE_CONSENT_STORAGE_KEY,
  COOKIE_CONSENT_VERSION,
  buildAcceptAllPreferences,
  buildRejectAllPreferences,
  normalizePreferences,
  parseStoredConsent,
  readStoredConsentFromStorage,
  serializeStoredConsent,
  writeStoredConsentToStorage,
} from "@/lib/consent/storage";

test("normalizePreferences always keeps necessary enabled", () => {
  assert.deepEqual(normalizePreferences(), {
    necessary: true,
    analytics: false,
    marketing: false,
  });
  assert.deepEqual(
    normalizePreferences({ analytics: true, marketing: true }),
    {
      necessary: true,
      analytics: true,
      marketing: true,
    },
  );
});

test("accept all and reject all presets match expected categories", () => {
  assert.deepEqual(buildAcceptAllPreferences(), {
    necessary: true,
    analytics: true,
    marketing: true,
  });
  assert.deepEqual(buildRejectAllPreferences(), {
    necessary: true,
    analytics: false,
    marketing: false,
  });
});

test("parseStoredConsent validates version and shape", () => {
  const valid = serializeStoredConsent(buildAcceptAllPreferences(), "2026-06-29T10:00:00.000Z");

  assert.deepEqual(parseStoredConsent(valid), {
    version: COOKIE_CONSENT_VERSION,
    preferences: buildAcceptAllPreferences(),
    updatedAt: "2026-06-29T10:00:00.000Z",
  });

  assert.equal(parseStoredConsent(null), null);
  assert.equal(parseStoredConsent("{broken"), null);
  assert.equal(parseStoredConsent(JSON.stringify({ version: 99 })), null);
  assert.equal(
    parseStoredConsent(
      JSON.stringify({
        version: COOKIE_CONSENT_VERSION,
        preferences: { analytics: "yes" },
        updatedAt: "",
      }),
    ),
    null,
  );
});

test("storage helpers read and write under the consent key", () => {
  const backing = new Map<string, string>();
  const storage = {
    getItem: (key: string) => backing.get(key) ?? null,
    setItem: (key: string, value: string) => {
      backing.set(key, value);
    },
  };

  assert.equal(readStoredConsentFromStorage(storage), null);

  const stored = writeStoredConsentToStorage(
    storage,
    buildRejectAllPreferences(),
  );

  assert.equal(backing.get(COOKIE_CONSENT_STORAGE_KEY), JSON.stringify(stored));
  assert.deepEqual(readStoredConsentFromStorage(storage), stored);
});
