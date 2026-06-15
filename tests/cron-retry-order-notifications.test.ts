import assert from "node:assert/strict";
import test from "node:test";

import {
  getCronAuthFailureStatus,
  getCronSecret,
  isCronAuthorized,
} from "@/lib/cron/cron-auth";

const CRON_PATH = "http://localhost/api/cron/retry-order-notifications";

function cronRequest(token?: string) {
  const headers = token ? { Authorization: `Bearer ${token}` } : undefined;
  return new Request(CRON_PATH, { headers });
}

test("isCronAuthorized returns false when CRON_SECRET is missing", () => {
  const original = process.env.CRON_SECRET;
  delete process.env.CRON_SECRET;

  assert.equal(getCronSecret(), "");
  assert.equal(isCronAuthorized(cronRequest("anything")), false);
  assert.equal(getCronAuthFailureStatus(cronRequest("anything")), 401);

  if (original) {
    process.env.CRON_SECRET = original;
  }
});

test("isCronAuthorized rejects wrong Bearer token", () => {
  assert.equal(isCronAuthorized(cronRequest("wrong-token"), "expected-secret"), false);
  assert.equal(getCronAuthFailureStatus(cronRequest("wrong-token")), 401);
});

test("isCronAuthorized accepts matching Bearer token", () => {
  const original = process.env.CRON_SECRET;
  process.env.CRON_SECRET = "expected-secret";

  assert.equal(isCronAuthorized(cronRequest("expected-secret"), "expected-secret"), true);
  assert.equal(getCronAuthFailureStatus(cronRequest("expected-secret")), null);

  if (original) {
    process.env.CRON_SECRET = original;
  } else {
    delete process.env.CRON_SECRET;
  }
});

test("cron auth gate returns 401 when CRON_SECRET is not configured", () => {
  const original = process.env.CRON_SECRET;
  delete process.env.CRON_SECRET;

  assert.equal(getCronAuthFailureStatus(cronRequest("any-token")), 401);

  if (original) {
    process.env.CRON_SECRET = original;
  }
});

test("cron auth gate returns 401 for wrong Bearer token", () => {
  const original = process.env.CRON_SECRET;
  process.env.CRON_SECRET = "cron-test-secret";

  assert.equal(getCronAuthFailureStatus(cronRequest("wrong-token")), 401);

  if (original) {
    process.env.CRON_SECRET = original;
  } else {
    delete process.env.CRON_SECRET;
  }
});

test("cron auth gate passes with correct Bearer token", () => {
  const original = process.env.CRON_SECRET;
  process.env.CRON_SECRET = "cron-test-secret";

  assert.equal(getCronAuthFailureStatus(cronRequest("cron-test-secret")), null);

  if (original) {
    process.env.CRON_SECRET = original;
  } else {
    delete process.env.CRON_SECRET;
  }
});
