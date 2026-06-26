import assert from "node:assert/strict";
import test from "node:test";

import {
  buildPersonalizationFieldValues,
  buildPersonalizationSummary,
  calculatePersonalizationDelta,
  disableOptionalPersonalizationField,
  enableOptionalPersonalizationField,
  formatPersonalizationToggleLabel,
  shouldShowPersonalizationInput,
  usesPersonalizationToggle,
} from "../lib/product-personalization";

const optionalPaidField = {
  id: "name",
  label: "Име",
  key: "name",
  type: "text" as const,
  placeholder: null,
  maxLength: 100,
  priceDelta: 2.5,
  required: false,
  allowsWishTemplates: false,
};

const optionalFreeField = {
  id: "note",
  label: "Бележка",
  key: "note",
  type: "textarea" as const,
  placeholder: null,
  maxLength: 200,
  priceDelta: 0,
  required: false,
  allowsWishTemplates: false,
};

const requiredPaidField = {
  id: "date",
  label: "Дата",
  key: "date",
  type: "date" as const,
  placeholder: null,
  maxLength: 10,
  priceDelta: 1.5,
  required: true,
  allowsWishTemplates: false,
};

const fields = [optionalPaidField, optionalFreeField, requiredPaidField];

test("personalization surcharge applies only to completed fields", () => {
  assert.equal(
    calculatePersonalizationDelta(fields, [
      { fieldId: "name", fieldKey: "name", label: "Име", value: "Мая" },
    ]),
    2.5,
  );
  assert.equal(calculatePersonalizationDelta(fields, []), 0);
});

test("optional personalization fields start closed without toggle", () => {
  const enabled = new Set<string>();

  assert.equal(usesPersonalizationToggle(optionalPaidField), true);
  assert.equal(usesPersonalizationToggle(requiredPaidField), false);
  assert.equal(shouldShowPersonalizationInput(optionalPaidField, enabled), false);
  assert.equal(shouldShowPersonalizationInput(requiredPaidField, enabled), true);
  assert.deepEqual(buildPersonalizationFieldValues(fields, {}, enabled), []);
  assert.equal(calculatePersonalizationDelta(fields, []), 0);
});

test("enabling optional field reveals input and immediately applies surcharge", () => {
  const enabled = enableOptionalPersonalizationField(new Set(), optionalPaidField.id);
  const values = { [optionalPaidField.id]: "" };

  assert.equal(shouldShowPersonalizationInput(optionalPaidField, enabled), true);
  assert.deepEqual(buildPersonalizationFieldValues(fields, values, enabled), []);
  assert.equal(
    calculatePersonalizationDelta(
      fields,
      buildPersonalizationFieldValues(fields, values, enabled),
      enabled,
    ),
    2.5,
  );
});

test("optional field charges only after entering a non-empty value", () => {
  const enabled = enableOptionalPersonalizationField(new Set(), optionalPaidField.id);
  const values = { [optionalPaidField.id]: "Мая" };
  const completed = buildPersonalizationFieldValues(fields, values, enabled);

  assert.deepEqual(completed, [
    { fieldId: "name", fieldKey: "name", label: "Име", value: "Мая" },
  ]);
  assert.equal(calculatePersonalizationDelta(fields, completed), 2.5);
  assert.equal(
    buildPersonalizationSummary(fields, values, enabled),
    "Име: Мая",
  );
});

test("disabling optional field clears value and removes surcharge", () => {
  const enabled = enableOptionalPersonalizationField(new Set(), optionalPaidField.id);
  const disabled = disableOptionalPersonalizationField(
    enabled,
    { [optionalPaidField.id]: "Мая" },
    optionalPaidField.id,
  );

  assert.equal(disabled.enabledOptionalFields.has(optionalPaidField.id), false);
  assert.equal(disabled.values[optionalPaidField.id], undefined);
  assert.deepEqual(
    buildPersonalizationFieldValues(fields, disabled.values, disabled.enabledOptionalFields),
    [],
  );
  assert.equal(
    calculatePersonalizationDelta(
      fields,
      buildPersonalizationFieldValues(fields, disabled.values, disabled.enabledOptionalFields),
    ),
    0,
  );
});

test("optional field with zero priceDelta uses label without surcharge", () => {
  assert.equal(
    formatPersonalizationToggleLabel(optionalFreeField),
    "Добавете Бележка",
  );
  assert.match(
    formatPersonalizationToggleLabel(optionalPaidField),
    /Добавете Име \(\+2,50 €\)/,
  );
});

test("required personalization field stays visible without toggle", () => {
  const enabled = new Set<string>();

  assert.equal(usesPersonalizationToggle(requiredPaidField), false);
  assert.equal(shouldShowPersonalizationInput(requiredPaidField, enabled), true);
  assert.deepEqual(
    buildPersonalizationFieldValues(
      fields,
      { [requiredPaidField.id]: "2026-06-15" },
      enabled,
    ),
    [{
      fieldId: "date",
      fieldKey: "date",
      label: "Дата",
      value: "2026-06-15",
    }],
  );
  assert.equal(
    calculatePersonalizationDelta(
      fields,
      buildPersonalizationFieldValues(
        fields,
        { [requiredPaidField.id]: "2026-06-15" },
        enabled,
      ),
    ),
    1.5,
  );
});
