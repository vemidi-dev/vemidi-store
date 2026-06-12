import { adminFormFields } from "@/lib/admin/form-fields";
import type { ParsedOptionGroup, ParsedOptionValue } from "@/lib/admin/types";

const KEY_PATTERN = /^[a-z][a-z0-9_]{0,63}$/;
const INPUT_TYPES = new Set(["single", "multiple", "text", "textarea", "date"]);

function slugifyKey(name: string) {
  const normalized = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 64);
  return normalized.match(KEY_PATTERN) ? normalized : "";
}

function parseNumber(value: string, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function parseProductOptionGroups(formData: FormData): {
  groups: ParsedOptionGroup[];
  error: string | null;
} {
  const ids = formData.getAll(adminFormFields.optionGroup.ids).map((v) => String(v ?? "").trim());
  const names = formData.getAll(adminFormFields.optionGroup.names).map((v) => String(v ?? "").trim());
  const keys = formData.getAll(adminFormFields.optionGroup.keys).map((v) => String(v ?? "").trim());
  const inputTypes = formData
    .getAll(adminFormFields.optionGroup.inputTypes)
    .map((v) => String(v ?? "").trim());
  const requiredFlags = formData.getAll(adminFormFields.optionGroup.required);
  const minSelects = formData
    .getAll(adminFormFields.optionGroup.minSelects)
    .map((v) => String(v ?? "").trim());
  const maxSelects = formData
    .getAll(adminFormFields.optionGroup.maxSelects)
    .map((v) => String(v ?? "").trim());
  const sortOrders = formData
    .getAll(adminFormFields.optionGroup.sortOrders)
    .map((v) => String(v ?? "").trim());
  const activeFlags = formData.getAll(adminFormFields.optionGroup.active);
  const dependsOn = formData
    .getAll(adminFormFields.optionGroup.dependsOnOptionIds)
    .map((v) => String(v ?? "").trim());
  const placeholders = formData
    .getAll(adminFormFields.optionGroup.placeholders)
    .map((v) => String(v ?? "").trim());
  const maxLengths = formData
    .getAll(adminFormFields.optionGroup.maxLengths)
    .map((v) => String(v ?? "").trim());
  const textPriceDeltas = formData
    .getAll(adminFormFields.optionGroup.textPriceDeltas)
    .map((v) => String(v ?? "").trim());
  const valuePayloads = formData
    .getAll(adminFormFields.optionGroup.valuesJson)
    .map((v) => String(v ?? "").trim());

  const rowCount = Math.max(
    names.length,
    keys.length,
    inputTypes.length,
    valuePayloads.length,
  );

  const groups: ParsedOptionGroup[] = [];
  const seenKeys = new Set<string>();

  for (let index = 0; index < rowCount; index += 1) {
    const name = names[index] ?? "";
    const inputType = inputTypes[index] ?? "";
    const valuesJson = valuePayloads[index] ?? "[]";

    if (!name && !inputType) {
      continue;
    }

    if (!name) {
      return { groups: [], error: "Всяка група опции трябва да има име." };
    }

    if (!INPUT_TYPES.has(inputType)) {
      return { groups: [], error: `Невалиден тип за група „${name}".` };
    }

    let key = keys[index] ?? "";
    if (!key) {
      key = slugifyKey(name);
    }
    if (!KEY_PATTERN.test(key)) {
      return {
        groups: [],
        error: `Ключът на група „${name}" трябва да е малки латински букви, цифри и _.`,
      };
    }
    if (seenKeys.has(key)) {
      return { groups: [], error: `Дублиран ключ на група: ${key}.` };
    }
    seenKeys.add(key);

    const minSelect = parseNumber(minSelects[index] ?? "0", 0);
    const maxSelect = parseNumber(maxSelects[index] ?? "1", 1);
    const textPriceDelta = Math.max(0, parseNumber(textPriceDeltas[index] ?? "0", 0));

    if (inputType === "single" && maxSelect !== 1) {
      return {
        groups: [],
        error: `Група „${name}" (един избор) трябва max = 1.`,
      };
    }

    if (["text", "textarea", "date"].includes(inputType) && (minSelect !== 0 || maxSelect !== 0)) {
      return {
        groups: [],
        error: `Текстовата група „${name}" не поддържа min/max избори.`,
      };
    }

    if (minSelect < 0 || maxSelect < minSelect) {
      return { groups: [], error: `Невалидни min/max за група „${name}".` };
    }

    let values: ParsedOptionValue[] = [];
    if (inputType === "single" || inputType === "multiple") {
      try {
        const parsed: unknown = JSON.parse(valuesJson || "[]");
        if (!Array.isArray(parsed)) {
          return { groups: [], error: `Невалидни стойности за група „${name}".` };
        }

        const valueKeys = new Set<string>();
        let defaultCount = 0;

        values = parsed.flatMap((entry, valueIndex) => {
          if (!entry || typeof entry !== "object") {
            return [];
          }
          const row = entry as Record<string, unknown>;
          const label = typeof row.label === "string" ? row.label.trim() : "";
          let valueKey = typeof row.key === "string" ? row.key.trim() : "";
          if (!label) {
            return [];
          }
          if (!valueKey) {
            valueKey = slugifyKey(label);
          }
          if (!KEY_PATTERN.test(valueKey) || valueKeys.has(valueKey)) {
            throw new Error(`invalid_value_key:${name}`);
          }
          valueKeys.add(valueKey);

          const priceDelta = Math.max(0, Number(row.priceDelta) || 0);
          const isDefault = Boolean(row.isDefault);
          if (isDefault) {
            defaultCount += 1;
          }

          return [{
            id: typeof row.id === "string" ? row.id.trim() || null : null,
            label,
            key: valueKey,
            priceDelta,
            isDefault,
            isActive: row.isActive !== false,
            isSoldOut: Boolean(row.isSoldOut),
            sku: typeof row.sku === "string" ? row.sku.trim() || null : null,
            sortOrder: Number(row.sortOrder) || valueIndex,
          }];
        });

        if (inputType === "single" && defaultCount > 1) {
          return {
            groups: [],
            error: `Група „${name}" може да има само една стойност по подразбиране.`,
          };
        }
      } catch (error) {
        if (error instanceof Error && error.message.startsWith("invalid_value_key:")) {
          return { groups: [], error: `Невалиден ключ на стойност в група „${name}".` };
        }
        return { groups: [], error: `Невалидни стойности за група „${name}".` };
      }
    }

    const maxLengthRaw = maxLengths[index] ?? "";
    const maxLength = maxLengthRaw ? parseNumber(maxLengthRaw, 0) : null;

    groups.push({
      id: ids[index]?.trim() || null,
      name,
      key,
      inputType: inputType as ParsedOptionGroup["inputType"],
      isRequired: requiredFlags[index] === "on",
      minSelect,
      maxSelect,
      sortOrder: parseNumber(sortOrders[index] ?? String(index), index),
      isActive: activeFlags[index] !== "off",
      pricingMode: "delta",
      dependsOnOptionId: dependsOn[index]?.trim() || null,
      placeholder: placeholders[index] || null,
      maxLength: maxLength && maxLength >= 1 && maxLength <= 1000 ? maxLength : null,
      textPriceDelta,
      values,
    });
  }

  return { groups, error: null };
}

export function detectDuplicateOptionWarnings(
  groups: ParsedOptionGroup[],
  colorFieldLabels: string[],
  personalizationLabels: string[],
): string[] {
  const warnings: string[] = [];
  const legacyLabels = new Set(
    [...colorFieldLabels, ...personalizationLabels]
      .map((label) => label.trim().toLowerCase())
      .filter(Boolean),
  );

  groups.forEach((group) => {
    if (legacyLabels.has(group.name.trim().toLowerCase())) {
      warnings.push(
        `Група „${group.name}" прилича на съществуващо legacy поле — избягвайте дублиране.`,
      );
    }
  });

  return warnings;
}
