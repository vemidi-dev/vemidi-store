import assert from "node:assert/strict";
import test from "node:test";

import {
  buildCheckoutDeliveryPayload,
  formatEcontAddressDeliveryDetails,
  validateDeliveryPayload,
} from "@/lib/checkout/delivery-payload";

const sampleOffice = {
  id: 10,
  code: "1000",
  name: "София Младост",
  isAPS: false,
  fullAddress: "София, бул. Александър Малинов 31",
};

const automatOffice = {
  id: 11,
  code: "1001",
  name: "София APS",
  isAPS: true,
  fullAddress: "София, ж.к. Младост 4",
};

test("Econt address without note uses manual address only", () => {
  const payload = buildCheckoutDeliveryPayload({
    courier: "econt",
    deliveryType: "address",
    city: "София",
    officeOrPostcode: "",
    address: "ул. Витоша 15",
    deliveryNote: "",
    selectedOffice: null,
  });

  assert.equal(payload.deliveryType, "address");
  assert.equal(payload.details, "ул. Витоша 15");
  assert.equal(validateDeliveryPayload(payload), null);
});

test("Econt address with note combines address and clarification", () => {
  const payload = buildCheckoutDeliveryPayload({
    courier: "econt",
    deliveryType: "address",
    city: "София",
    officeOrPostcode: "",
    address: "ул. Витоша 15",
    deliveryNote: "Вход Б, етаж 3",
    selectedOffice: null,
  });

  assert.equal(payload.details, "ул. Витоша 15\nВход Б, етаж 3");
  assert.equal(validateDeliveryPayload(payload), null);
});

test("Econt office delivery keeps office label and optional note", () => {
  const payload = buildCheckoutDeliveryPayload({
    courier: "econt",
    deliveryType: "office",
    city: "София",
    officeOrPostcode: "",
    address: "",
    deliveryNote: "Обадете се преди доставка",
    selectedOffice: sampleOffice,
  });

  assert.equal(payload.deliveryType, "office");
  assert.match(payload.officeOrPostcode, /София Младост/);
  assert.equal(payload.details, "Обадете се преди доставка");
  assert.equal(validateDeliveryPayload(payload), null);
});

test("Econt automat maps to office delivery type with automat details", () => {
  const payload = buildCheckoutDeliveryPayload({
    courier: "econt",
    deliveryType: "automat",
    city: "София",
    officeOrPostcode: "",
    address: "",
    deliveryNote: "",
    selectedOffice: automatOffice,
  });

  assert.equal(payload.deliveryType, "office");
  assert.match(payload.details, /Автомат на Еконт/);
  assert.equal(validateDeliveryPayload(payload), null);
});

test("Speedy address uses postcode and combined address details", () => {
  const payload = buildCheckoutDeliveryPayload({
    courier: "speedy",
    deliveryType: "address",
    city: "Пловдив",
    officeOrPostcode: "4000",
    address: "ул. Главна 1",
    deliveryNote: "Домофон 12",
    selectedOffice: null,
  });

  assert.equal(payload.courier, "speedy");
  assert.equal(payload.officeOrPostcode, "4000");
  assert.equal(payload.details, "ул. Главна 1\nДомофон 12");
  assert.equal(validateDeliveryPayload(payload), null);
});

test("empty address fails server-side validation", () => {
  const payload = buildCheckoutDeliveryPayload({
    courier: "econt",
    deliveryType: "address",
    city: "София",
    officeOrPostcode: "",
    address: "",
    deliveryNote: "",
    selectedOffice: null,
  });

  assert.equal(validateDeliveryPayload(payload), "address_required");
});

test("formatEcontAddressDeliveryDetails keeps note optional", () => {
  assert.equal(formatEcontAddressDeliveryDetails("Адрес 1"), "Адрес 1");
  assert.equal(
    formatEcontAddressDeliveryDetails("Адрес 1", "   "),
    "Адрес 1",
  );
});
