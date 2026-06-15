import assert from "node:assert/strict";
import test from "node:test";

import {
  loadWithdrawalRequestByIdempotencyKey,
  resolveWithdrawalRequestInsert,
} from "@/lib/withdrawal/request-store";
import type { WithdrawalRequestRow } from "@/lib/withdrawal/withdrawal-email";

const idempotencyKey = "a109c2e8-d8d2-4666-8e6c-4f9e1ae1c5e4";

const existingRequest: WithdrawalRequestRow = {
  id: "11111111-2222-4333-8444-555555555555",
  reference_number: "WDR-20260615-EXIST1",
  order_id: null,
  order_number_submitted: "AAAAAAAA",
  contact_email: "client@example.com",
  contact_phone: null,
  customer_name: "Мария",
  received_at: "2026-06-10",
  items_description: "Продукт",
  note: null,
  status: "new",
  created_at: "2026-06-15T10:00:00.000Z",
};

const input = {
  orderNumber: "AAAAAAAA",
  customerName: "Мария",
  contactEmail: "client@example.com",
  contactPhone: null,
  receivedAt: "2026-06-10",
  itemsDescription: "Продукт",
  note: null,
  idempotencyKey,
  orderId: null,
};

test("resolveWithdrawalRequestInsert returns existing row on duplicate idempotency key", async () => {
  let lookupCount = 0;
  let insertCalls = 0;

  const supabase = {
    from() {
      return {
        select() {
          return {
            eq() {
              return {
                async maybeSingle() {
                  lookupCount += 1;
                  if (lookupCount >= 2) {
                    return { data: existingRequest, error: null };
                  }
                  return { data: null, error: null };
                },
              };
            },
          };
        },
        insert() {
          insertCalls += 1;
          return {
            select() {
              return {
                async single() {
                  return { data: null, error: { code: "23505" } };
                },
              };
            },
          };
        },
      };
    },
  };

  const result = await resolveWithdrawalRequestInsert(supabase as never, input);

  assert.equal(result.request.reference_number, "WDR-20260615-EXIST1");
  assert.equal(result.created, false);
  assert.equal(insertCalls, 1);
  assert.equal(lookupCount, 2);
});

test("loadWithdrawalRequestByIdempotencyKey returns stored request", async () => {
  const supabase = {
    from() {
      return {
        select() {
          return {
            eq() {
              return {
                async maybeSingle() {
                  return { data: existingRequest, error: null };
                },
              };
            },
          };
        },
      };
    },
  };

  const result = await loadWithdrawalRequestByIdempotencyKey(
    supabase as never,
    idempotencyKey,
  );

  assert.equal(result?.reference_number, "WDR-20260615-EXIST1");
});
