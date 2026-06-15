import assert from "node:assert/strict";
import test from "node:test";

import type { OrderRow } from "@/lib/admin/orders";
import { deliverOrderNotificationChannel } from "@/lib/orders/send-order-notifications";

const baseOrder = {
  id: "a1b2c3d4-e5f6-4789-a012-3456789abcde",
  created_at: new Date().toISOString(),
  status: "new",
  product_name: "Тест продукт",
  kit_name: null,
  kit_size: null,
  coloring: null,
  personalization: null,
  child_name: null,
  total_price: 25,
  currency: "EUR",
  customer_name: "Тест Клиент",
  customer_phone: "+359881234567",
  customer_email: "customer@example.com",
  courier: "econt",
  delivery_type: "office",
  city: "София",
  delivery_details: "",
  office_id: null,
  office_name: "Офис",
  office_address: "София",
  payment_method: "cod",
  note: null,
  raw_payload: {},
} as OrderRow;

test("deliverOrderNotificationChannel skips when Resend is not configured", async () => {
  const original = process.env.RESEND_API_KEY;
  delete process.env.RESEND_API_KEY;

  const result = await deliverOrderNotificationChannel(baseOrder, "admin");
  assert.equal(result.sent, false);
  assert.equal(result.skipped, true);

  if (original) {
    process.env.RESEND_API_KEY = original;
  }
});

test("deliverOrderNotificationChannel returns customer skip without email", async () => {
  const result = await deliverOrderNotificationChannel(
    {
      ...baseOrder,
      customer_email: null,
    },
    "customer",
  );

  assert.equal(result.skipped, true);
  assert.equal(result.sent, false);
});
