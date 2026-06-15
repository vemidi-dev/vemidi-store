import assert from "node:assert/strict";
import test from "node:test";

import { resolveWithdrawalOrderId } from "@/lib/withdrawal/match-order";

type OrderRow = {
  id: string;
  customer_email: string | null;
  customer_phone: string | null;
};

function createMockSupabase(rows: OrderRow[]) {
  return {
    from() {
      return {
        select() {
          return {
            ilike() {
              return {
                async limit() {
                  return { data: rows, error: null };
                },
              };
            },
          };
        },
      };
    },
  };
}

test("resolveWithdrawalOrderId links order when ref and email match", async () => {
  const orderId = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";
  const supabase = createMockSupabase([
    {
      id: orderId,
      customer_email: "maria@example.com",
      customer_phone: "0899123456",
    },
  ]);

  const result = await resolveWithdrawalOrderId(supabase as never, {
    orderNumber: "AAAAAAAA",
    contactEmail: "maria@example.com",
    contactPhone: null,
  });

  assert.equal(result, orderId);
});

test("resolveWithdrawalOrderId does not reveal mismatch as found order", async () => {
  const supabase = createMockSupabase([
    {
      id: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
      customer_email: "maria@example.com",
      customer_phone: "0899123456",
    },
  ]);

  const result = await resolveWithdrawalOrderId(supabase as never, {
    orderNumber: "AAAAAAAA",
    contactEmail: "wrong@example.com",
    contactPhone: null,
  });

  assert.equal(result, null);
});

test("resolveWithdrawalOrderId returns null for ambiguous contact matches", async () => {
  const supabase = createMockSupabase([
    {
      id: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
      customer_email: "shared@example.com",
      customer_phone: "0899111111",
    },
    {
      id: "aaaaaaaa-1111-2222-3333-444444444444",
      customer_email: "shared@example.com",
      customer_phone: "0899222222",
    },
  ]);

  const result = await resolveWithdrawalOrderId(supabase as never, {
    orderNumber: "AAAAAAAA",
    contactEmail: "shared@example.com",
    contactPhone: null,
  });

  assert.equal(result, null);
});

test("resolveWithdrawalOrderId returns null when no orders match prefix", async () => {
  const supabase = createMockSupabase([]);

  const result = await resolveWithdrawalOrderId(supabase as never, {
    orderNumber: "ZZZZZZZZ",
    contactEmail: "maria@example.com",
    contactPhone: null,
  });

  assert.equal(result, null);
});
