import assert from "node:assert/strict";
import test from "node:test";

import {
  buildGaPurchaseParams,
  canSendGaPurchaseEvent,
} from "@/lib/consent/google-analytics-client";
import { normalizePreferences } from "@/lib/consent/storage";

test("buildGaPurchaseParams maps purchase payload without PII", () => {
  assert.deepEqual(
    buildGaPurchaseParams({
      value: 42.5,
      currency: "EUR",
      itemCount: 2,
    }),
    {
      value: 42.5,
      currency: "EUR",
      num_items: 2,
    },
  );
});

test("canSendGaPurchaseEvent requires analytics consent, measurement ID and gtag", () => {
  assert.equal(
    canSendGaPurchaseEvent(
      normalizePreferences({ analytics: true }),
      "G-BRJYG0WKXF",
      true,
    ),
    true,
  );
  assert.equal(
    canSendGaPurchaseEvent(
      normalizePreferences({ analytics: false }),
      "G-BRJYG0WKXF",
      true,
    ),
    false,
  );
  assert.equal(
    canSendGaPurchaseEvent(
      normalizePreferences({ analytics: true }),
      "",
      true,
    ),
    false,
  );
  assert.equal(
    canSendGaPurchaseEvent(
      normalizePreferences({ analytics: true }),
      "G-BRJYG0WKXF",
      false,
    ),
    false,
  );
});
