import assert from "node:assert/strict";
import test from "node:test";

import type { OrderRow } from "@/lib/admin/orders";
import {
  buildAdminOrderEmail,
  buildCustomerOrderEmail,
  getStoreOrderEmailItems,
} from "@/lib/orders/order-email";

const baseOrder: OrderRow = {
  id: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
  created_at: "2026-06-10T12:00:00.000Z",
  status: "new",
  product_name: null,
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
  note: null,
  raw_payload: {
    source: "vemidi-store",
    order: { items: [] },
  },
};

function orderWithItem(item: Record<string, unknown>): OrderRow {
  return {
    ...baseOrder,
    raw_payload: {
      source: "vemidi-store",
      order: { items: [item] },
    },
  };
}

const legacyPersonalizationOrder = orderWithItem({
  name: "Кутия за спомени",
  unitPrice: 42.5,
  quantity: 1,
  personalization: "С любов за Ваня",
  personalizationFields: [],
  selectedColors: [{ fieldLabel: "Панделка", optionName: "Розова" }],
  optionSelections: [],
});

const structuredPersonalizationOrder = orderWithItem({
  name: "Дървена картичка",
  unitPrice: 35,
  quantity: 1,
  personalization: "Име: Мария\nПожелание: Честит рожден ден",
  personalizationFields: [
    { fieldId: "name", fieldKey: "name", label: "Име", value: "Мария" },
    {
      fieldId: "wish",
      fieldKey: "wish",
      label: "Пожелание",
      value: "Честит рожден ден",
    },
  ],
  selectedColors: [
    {
      fieldId: "ribbon-field",
      fieldLabel: "Цвят на панделката",
      optionName: "Червен",
    },
  ],
  optionSelections: [{
    groupId: "envelope-group",
    groupName: "Плик за пари",
    groupKey: "envelope",
    inputType: "single",
    textValue: null,
    groupPriceDelta: 0,
    values: [{
      valueId: "yes",
      label: "Да",
      key: "yes",
      priceDelta: 0,
      sku: null,
    }],
  }],
});

const quantityColorOrder = orderWithItem({
  name: "Букет",
  unitPrice: 40,
  quantity: 1,
  personalization: null,
  personalizationFields: [],
  selectedColors: [
    {
      fieldId: "roses-field",
      fieldLabel: "Рози",
      optionName: "Червени",
      quantity: 5,
    },
    {
      fieldId: "roses-field",
      fieldLabel: "Рози",
      optionName: "Бели",
      quantity: 4,
    },
    {
      fieldId: "roses-field",
      fieldLabel: "Рози",
      optionName: "Розови",
      quantity: 3,
    },
  ],
  optionSelections: [],
});

test("getStoreOrderEmailItems uses shared order item detail lines", () => {
  const items = getStoreOrderEmailItems(legacyPersonalizationOrder);
  assert.equal(items.length, 1);
  assert.deepEqual(items[0]?.detailLines, [
    "Персонализация: С любов за Ваня",
    "Панделка: Розова",
  ]);
});

test("customer email shows quantity color mode with grouped quantities", () => {
  const email = buildCustomerOrderEmail(quantityColorOrder);
  assert.match(email.html, /Рози: Червени × 5, Бели × 4, Розови × 3/);
});

test("customer email shows choice color mode with field label", () => {
  const email = buildCustomerOrderEmail(structuredPersonalizationOrder);
  assert.match(email.html, /Цвят на панделката: Червен/);
});

test("customer email shows structured personalization fields as separate lines", () => {
  const email = buildCustomerOrderEmail(structuredPersonalizationOrder);
  assert.match(email.html, /Име: Мария/);
  assert.match(email.html, /Пожелание: Честит рожден ден/);
  assert.doesNotMatch(email.html, /Персонализация: Име: Мария/);
});

test("customer email keeps legacy personalization fallback", () => {
  const email = buildCustomerOrderEmail(legacyPersonalizationOrder);
  assert.match(email.html, /Персонализация: С любов за Ваня/);
});

test("customer email shows option selections", () => {
  const email = buildCustomerOrderEmail(structuredPersonalizationOrder);
  assert.match(email.html, /Плик за пари: Да/);
});

test("buildAdminOrderEmail includes customer and admin link", () => {
  const email = buildAdminOrderEmail(
    legacyPersonalizationOrder,
    "https://example.com/admin?tab=orders",
  );
  assert.match(email.subject, /Нова поръчка AAAAAAAA/);
  assert.match(email.html, /Мария Иванова/);
  assert.match(email.html, /Кутия за спомени/);
  assert.match(email.html, /https:\/\/example.com\/admin\?tab=orders/);
});

test("buildCustomerOrderEmail includes confirmation copy", () => {
  const email = buildCustomerOrderEmail(legacyPersonalizationOrder);
  assert.match(email.subject, /Потвърждение на поръчка AAAAAAAA/);
  assert.match(email.html, /Благодарим за поръчката/);
  assert.match(email.html, /Доставката се заплаща отделно при куриера/);
  assert.match(email.html, /\/withdrawal/);
});
