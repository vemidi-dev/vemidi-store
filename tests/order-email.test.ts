import assert from "node:assert/strict";
import test from "node:test";

import type { OrderRow } from "@/lib/admin/orders";
import {
  buildAdminOrderEmail,
  buildCustomerOrderEmail,
  getStoreOrderEmailItems,
} from "@/lib/orders/order-email";

const sampleOrder: OrderRow = {
  id: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
  created_at: "2026-06-10T12:00:00.000Z",
  status: "new",
  product_name: "Кутия за спомени",
  kit_name: null,
  kit_size: null,
  coloring: null,
  personalization: null,
  child_name: null,
  total_price: 42.5,
  currency: "EUR",
  customer_name: "Мария Иванова",
  customer_phone: "0899123456",
  customer_email: "maria@example.com",
  courier: "econt",
  delivery_type: "office",
  city: "София",
  delivery_details: null,
  office_id: null,
  office_name: "Офис Младост",
  office_address: null,
  payment_method: "cash_on_delivery",
  note: "Моля, обадете се преди изпращане.",
  raw_payload: {
    source: "vemidi-store",
    order: {
      items: [
        {
          name: "Кутия за спомени",
          unitPrice: 42.5,
          quantity: 1,
          personalization: "С любов за Ваня",
          selectedColors: [{ fieldLabel: "Панделка", optionName: "Розова" }],
        },
      ],
    },
  },
};

test("getStoreOrderEmailItems parses store order payload", () => {
  const items = getStoreOrderEmailItems(sampleOrder);
  assert.equal(items.length, 1);
  assert.equal(items[0]?.name, "Кутия за спомени");
  assert.equal(items[0]?.personalization, "С любов за Ваня");
});

test("buildAdminOrderEmail includes customer and admin link", () => {
  const email = buildAdminOrderEmail(sampleOrder, "https://example.com/admin?tab=orders");
  assert.match(email.subject, /Нова поръчка AAAAAAAA/);
  assert.match(email.html, /Мария Иванова/);
  assert.match(email.html, /Кутия за спомени/);
  assert.match(email.html, /https:\/\/example.com\/admin\?tab=orders/);
});

test("buildCustomerOrderEmail includes confirmation copy", () => {
  const email = buildCustomerOrderEmail(sampleOrder);
  assert.match(email.subject, /Потвърждение на поръчка AAAAAAAA/);
  assert.match(email.html, /Благодарим за поръчката/);
  assert.match(email.html, /Доставката се заплаща отделно при куриера/);
});
