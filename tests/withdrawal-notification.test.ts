import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { buildWithdrawalReferenceNumber } from "@/lib/withdrawal/reference";
import {
  buildWithdrawalAdminEmail,
  buildWithdrawalCustomerEmail,
  type WithdrawalRequestRow,
} from "@/lib/withdrawal/withdrawal-email";
import { isWithdrawalNotificationOutboxUnavailable } from "@/lib/withdrawal/outbox-errors";
import { isDeliveryReadyForDispatch } from "@/lib/orders/order-notification-schedule";

const sampleRequest: WithdrawalRequestRow = {
  id: "11111111-2222-4333-8444-555555555555",
  reference_number: "WDR-20260615-ABC123",
  order_id: null,
  order_number_submitted: "AAAAAAAA",
  contact_email: "client@example.com",
  contact_phone: "0899123456",
  customer_name: "Мария Иванова",
  received_at: "2026-06-10",
  items_description: "Кутия за спомени",
  note: null,
  status: "new",
  created_at: "2026-06-15T10:00:00.000Z",
};

test("buildWithdrawalReferenceNumber uses stable date prefix", () => {
  const ref = buildWithdrawalReferenceNumber(new Date("2026-06-15T12:00:00Z"));
  assert.match(ref, /^WDR-20260615-[A-F0-9]{6}$/);
});

test("buildWithdrawalCustomerEmail includes reference and statement copy", () => {
  const email = buildWithdrawalCustomerEmail(sampleRequest);
  assert.match(email.subject, /WDR-20260615-ABC123/);
  assert.match(email.html, /Мария Иванова/);
  assert.match(email.html, /Кутия за спомени/);
  assert.doesNotMatch(email.html, /password|secret|stack trace/i);
});

test("buildWithdrawalAdminEmail links to admin withdrawals tab", () => {
  const email = buildWithdrawalAdminEmail(
    sampleRequest,
    "https://example.com/admin?tab=withdrawals",
  );
  assert.match(email.html, /admin\?tab=withdrawals/);
});

test("isWithdrawalNotificationOutboxUnavailable detects missing table codes", () => {
  assert.equal(isWithdrawalNotificationOutboxUnavailable({ code: "42P01" }), true);
  assert.equal(isWithdrawalNotificationOutboxUnavailable({ code: "23505" }), false);
});

test("withdrawal notification delivery uses shared retry readiness rules", () => {
  assert.equal(
    isDeliveryReadyForDispatch({
      status: "pending",
      attempt_count: 1,
      next_retry_at: new Date(Date.now() - 1_000).toISOString(),
    }),
    true,
  );
});

test("contract_withdrawal_requests migration blocks public client access", () => {
  const sql = readFileSync("supabase/contract_withdrawal_requests.sql", "utf8");
  assert.match(sql, /revoke all on table public\.contract_withdrawal_requests from anon, authenticated/);
  assert.match(sql, /contract_withdrawal_requests_idempotency_key_key unique/);
  assert.match(sql, /withdrawal_notification_deliveries_request_channel_key/);
});
