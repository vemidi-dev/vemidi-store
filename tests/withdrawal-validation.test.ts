import assert from "node:assert/strict";
import test from "node:test";

import {
  validateWithdrawalForm,
  normalizeWithdrawalPhone,
  isWithdrawalStatus,
} from "@/lib/withdrawal/validation";
import { WITHDRAWAL_FIELD_LIMITS } from "@/lib/withdrawal/constants";

const validBase = {
  orderNumber: "AAAAAAAA",
  customerName: "Иван Петров",
  contactEmail: "ivan@example.com",
  contactPhone: "",
  receivedAt: "2026-06-10",
  itemsDescription: "Кутия за спомени",
  note: "",
  statementConfirmed: true,
  confirmationChecked: true,
  idempotencyKey: "a109c2e8-d8d2-4666-8e6c-4f9e1ae1c5e4",
  honeypot: "",
};

test("validateWithdrawalForm accepts valid submission", () => {
  const result = validateWithdrawalForm(validBase);
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.value.orderNumber, "AAAAAAAA");
    assert.equal(result.value.contactEmail, "ivan@example.com");
  }
});

test("validateWithdrawalForm accepts phone without email", () => {
  const result = validateWithdrawalForm({
    ...validBase,
    contactEmail: "",
    contactPhone: "+359 89 123 4567",
  });
  assert.equal(result.ok, true);
});

test("validateWithdrawalForm rejects missing contact", () => {
  const result = validateWithdrawalForm({
    ...validBase,
    contactEmail: "",
    contactPhone: "",
  });
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.ok(result.fieldErrors?.contact_email);
  }
});

test("validateWithdrawalForm rejects honeypot", () => {
  const result = validateWithdrawalForm({
    ...validBase,
    honeypot: "bot",
  });
  assert.equal(result.ok, false);
});

test("validateWithdrawalForm rejects oversized fields", () => {
  const result = validateWithdrawalForm({
    ...validBase,
    itemsDescription: "x".repeat(WITHDRAWAL_FIELD_LIMITS.itemsDescription + 1),
  });
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.ok(result.fieldErrors?.items_description);
  }
});

test("validateWithdrawalForm rejects future received date", () => {
  const result = validateWithdrawalForm({
    ...validBase,
    receivedAt: "2099-01-01",
  });
  assert.equal(result.ok, false);
});

test("validateWithdrawalForm rejects invalid idempotency key", () => {
  const result = validateWithdrawalForm({
    ...validBase,
    idempotencyKey: "not-a-uuid",
  });
  assert.equal(result.ok, false);
});

test("validateWithdrawalForm rejects missing statement and confirmation", () => {
  const result = validateWithdrawalForm({
    ...validBase,
    statementConfirmed: false,
    confirmationChecked: false,
  });
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.ok(result.fieldErrors?.statement_confirmed);
    assert.ok(result.fieldErrors?.confirmation_checked);
  }
});

test("normalizeWithdrawalPhone strips non-digits", () => {
  assert.equal(normalizeWithdrawalPhone("+359 (89) 123-4567"), "359891234567");
});

test("isWithdrawalStatus validates admin statuses", () => {
  assert.equal(isWithdrawalStatus("reviewing"), true);
  assert.equal(isWithdrawalStatus("refunded"), false);
});
