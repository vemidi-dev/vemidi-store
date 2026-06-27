import assert from "node:assert/strict";
import test from "node:test";

import {
  executeStorageUploadWithRetry,
  isRetryableStorageUploadError,
} from "@/lib/images/storage-upload-retry";

test("isRetryableStorageUploadError matches transient network failures", () => {
  assert.equal(isRetryableStorageUploadError("fetch failed"), true);
  assert.equal(isRetryableStorageUploadError("Gateway Timeout 504"), true);
  assert.equal(isRetryableStorageUploadError("already exists"), false);
});

test("executeStorageUploadWithRetry retries retryable errors up to max attempts", async () => {
  let attempts = 0;

  const result = await executeStorageUploadWithRetry(async () => {
    attempts += 1;
    if (attempts < 3) {
      return { error: new Error("fetch failed") };
    }
    return { error: null };
  }, { baseDelayMs: 0 });

  assert.equal(result.error, null);
  assert.equal(attempts, 3);
});

test("executeStorageUploadWithRetry does not retry permanent storage errors", async () => {
  let attempts = 0;

  const result = await executeStorageUploadWithRetry(async () => {
    attempts += 1;
    return { error: new Error("The resource already exists") };
  }, { baseDelayMs: 0 });

  assert.match(result.error?.message ?? "", /already exists/i);
  assert.equal(attempts, 1);
});
