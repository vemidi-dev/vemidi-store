import assert from "node:assert/strict";
import test from "node:test";

import { formatSpeedyOfficeLabel, isSpeedyConfigured } from "@/lib/shipping/speedy";

test("formatSpeedyOfficeLabel includes address when available", () => {
  const label = formatSpeedyOfficeLabel({
    name: "СОФИЯ - МЛАДОСТ 2",
    fullAddress: "София, ж.к. Младост 2",
  });

  assert.match(label, /СОФИЯ - МЛАДОСТ 2/);
  assert.match(label, /Младост 2/);
});

test("isSpeedyConfigured accepts primary environment variables", () => {
  const oldUsername = process.env.SPEEDY_USERNAME;
  const oldPassword = process.env.SPEEDY_PASSWORD;
  const oldApiUsername = process.env.SPEEDY_API_USERNAME;
  const oldApiPassword = process.env.SPEEDY_API_PASSWORD;

  process.env.SPEEDY_USERNAME = "user";
  process.env.SPEEDY_PASSWORD = "pass";
  delete process.env.SPEEDY_API_USERNAME;
  delete process.env.SPEEDY_API_PASSWORD;

  try {
    assert.equal(isSpeedyConfigured(), true);
  } finally {
    if (oldUsername === undefined) {
      delete process.env.SPEEDY_USERNAME;
    } else {
      process.env.SPEEDY_USERNAME = oldUsername;
    }

    if (oldPassword === undefined) {
      delete process.env.SPEEDY_PASSWORD;
    } else {
      process.env.SPEEDY_PASSWORD = oldPassword;
    }

    if (oldApiUsername === undefined) {
      delete process.env.SPEEDY_API_USERNAME;
    } else {
      process.env.SPEEDY_API_USERNAME = oldApiUsername;
    }

    if (oldApiPassword === undefined) {
      delete process.env.SPEEDY_API_PASSWORD;
    } else {
      process.env.SPEEDY_API_PASSWORD = oldApiPassword;
    }
  }
});
