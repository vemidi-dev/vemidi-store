import assert from "node:assert/strict";
import test from "node:test";

import {
  getProductConfigurationDraftKey,
  mergeProductConfigurationDraft,
  mergeProductOptionSelections,
  parseProductConfigurationDraft,
  resolveProductConfigurationDraft,
} from "@/lib/product-configuration-draft";

test("product configuration draft restores every customer selection", () => {
  const draft = parseProductConfigurationDraft(JSON.stringify({
    values: { personalization: "Мария" },
    enabledOptionalFieldIds: ["personalization"],
    selectedColorOptionIdsByFieldId: { color: ["pink"] },
    optionSelections: [
      { groupId: "size", valueIds: ["mini"] },
      { groupId: "coloring", valueIds: ["markers"] },
    ],
  }));

  assert.deepEqual(draft, {
    values: { personalization: "Мария" },
    enabledOptionalFieldIds: ["personalization"],
    selectedColorOptionIdsByFieldId: { color: ["pink"] },
    selectedColorQuantitiesByFieldId: {},
    optionSelections: [
      { groupId: "size", valueIds: ["mini"] },
      { groupId: "coloring", valueIds: ["markers"] },
    ],
  });
});

test("incoming landing selections override stale stored groups and preserve the rest", () => {
  const merged = mergeProductOptionSelections(
    [
      { groupId: "size", valueIds: ["standard"] },
      { groupId: "coloring", valueIds: ["paints"] },
    ],
    [{ groupId: "size", valueIds: ["maxi"] }],
  );

  assert.deepEqual(merged, [
    { groupId: "size", valueIds: ["maxi"] },
    { groupId: "coloring", valueIds: ["paints"] },
  ]);
});

test("invalid draft JSON is ignored and storage keys are product-specific", () => {
  assert.equal(parseProductConfigurationDraft("{"), null);
  assert.notEqual(
    getProductConfigurationDraftKey("product-a"),
    getProductConfigurationDraftKey("product-b"),
  );
});

test("partial landing handoff merges personalization colors and options into the draft", () => {
  const merged = mergeProductConfigurationDraft({
    values: { old: "Запази" },
    enabledOptionalFieldIds: ["old"],
    selectedColorOptionIdsByFieldId: { frame: ["white"] },
    selectedColorQuantitiesByFieldId: {},
    optionSelections: [{ groupId: "size", valueIds: ["standard"] }],
  }, {
    personalizationFields: [{
      fieldId: "name-id",
      fieldKey: "name",
      label: "Име",
      value: "Мария",
    }],
    selectedColors: [{
      fieldId: "frame",
      fieldLabel: "Рамка",
      groupId: "frame",
      groupKey: "frame",
      groupLabel: "Рамка",
      optionId: "pink",
      optionName: "Розово",
      optionHex: "#ffc0cb",
    }],
    optionSelections: [{ groupId: "size", valueIds: ["maxi"] }],
  });

  assert.deepEqual(merged, {
    values: { old: "Запази", "name-id": "Мария" },
    enabledOptionalFieldIds: ["old", "name-id"],
    selectedColorOptionIdsByFieldId: { frame: ["pink"] },
    selectedColorQuantitiesByFieldId: {},
    optionSelections: [{ groupId: "size", valueIds: ["maxi"] }],
  });
});

test("stale stored option selections are dropped when configured defaults changed", () => {
  const stored = parseProductConfigurationDraft(JSON.stringify({
    values: { note: "Р—Р°РїР°Р·Рё" },
    enabledOptionalFieldIds: [],
    selectedColorOptionIdsByFieldId: {},
    optionSelections: [{ groupId: "size", valueIds: ["old-default"] }],
    optionDefaultsSignature: "size:old-default",
  }));

  const restored = resolveProductConfigurationDraft(
    stored,
    null,
    [],
    "size:new-default",
  );

  assert.deepEqual(restored?.values, { note: "Р—Р°РїР°Р·Рё" });
  assert.deepEqual(restored?.optionSelections, []);
  assert.equal(restored?.optionDefaultsSignature, "size:new-default");
});
