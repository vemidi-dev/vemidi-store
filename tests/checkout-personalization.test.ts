import assert from "node:assert/strict";
import test from "node:test";

import {
  validatePersonalizationFields,
  type PersonalizationFieldDefinition,
} from "@/lib/checkout-personalization";

const definitions: PersonalizationFieldDefinition[] = [
  {
    id: "name",
    product_id: "product",
    label: "Име",
    field_key: "name",
    field_type: "text",
    max_length: 30,
    is_required: true,
  },
  {
    id: "date",
    product_id: "product",
    label: "Дата",
    field_key: "date",
    field_type: "date",
    max_length: 10,
    is_required: false,
  },
];

test("structured personalization is canonicalized from server definitions", () => {
  const result = validatePersonalizationFields(
    [
      { fieldId: "name", fieldKey: "forged", label: "Forged", value: "  Мария  " },
      { fieldId: "date", value: "2026-06-09" },
    ],
    definitions,
  );

  assert.deepEqual(result, {
    ok: true,
    fields: [
      { fieldId: "name", fieldKey: "name", label: "Име", value: "Мария" },
      { fieldId: "date", fieldKey: "date", label: "Дата", value: "2026-06-09" },
    ],
    summary: "Име: Мария\nДата: 2026-06-09",
  });
});

test("required personalization cannot be omitted", () => {
  assert.deepEqual(validatePersonalizationFields([], definitions), {
    ok: false,
    code: "required_personalization_missing",
  });
});

test("unknown and duplicate personalization fields are rejected", () => {
  assert.deepEqual(
    validatePersonalizationFields([{ fieldId: "unknown", value: "test" }], definitions),
    { ok: false, code: "invalid_personalization_fields" },
  );
  assert.deepEqual(
    validatePersonalizationFields(
      [
        { fieldId: "name", value: "Мария" },
        { fieldId: "name", value: "Иван" },
      ],
      definitions,
    ),
    { ok: false, code: "invalid_personalization_fields" },
  );
});

test("field length and date format are enforced", () => {
  assert.deepEqual(
    validatePersonalizationFields(
      [{ fieldId: "name", value: "x".repeat(31) }],
      definitions,
    ),
    { ok: false, code: "personalization_too_long" },
  );
  assert.deepEqual(
    validatePersonalizationFields(
      [
        { fieldId: "name", value: "Мария" },
        { fieldId: "date", value: "2026-02-31" },
      ],
      definitions,
    ),
    { ok: false, code: "invalid_personalization_date" },
  );
});
