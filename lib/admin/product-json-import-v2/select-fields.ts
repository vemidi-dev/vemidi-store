import type { ParsedOptionGroup } from "@/lib/admin/types";
import type { ProductJsonImportIssue } from "./types";

const KEY = /^[a-z][a-z0-9_]{0,63}$/;
function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function text(value: unknown) { return typeof value === "string" ? value.trim() : ""; }
function money(value: unknown): number | null {
  if (value === undefined) return 0;
  return typeof value === "number" && Number.isFinite(value) && value >= 0 &&
    Math.abs(value * 100 - Math.round(value * 100)) < 1e-9 ? Math.round(value * 100) / 100 : null;
}

/** Import choice fields through the existing option engine, not legacy text personalization. */
export function splitSelectPersonalizationFields(input: unknown, slug: string) {
  const groups: ParsedOptionGroup[] = [];
  const errors: ProductJsonImportIssue[] = [];
  const fields: unknown[] = [];
  const keys = new Set<string>();
  function error(message: string) {
    errors.push({ code: "INVALID_SELECT_FIELD", severity: "error", slug, message });
  }
  if (!Array.isArray(input)) return { fields: input, groups, errors };
  if (input.length > 20) error("Един продукт може да има най-много 20 полета за персонализация и избор общо.");
  for (const [index, field] of input.entries()) {
    if (!record(field) || field.field_type !== "select") {
      fields.push(field);
      continue;
    }
    const name = text(field.label) || `#${index + 1}`;
    const key = text(field.field_key);
    const baseDelta = money(field.price_delta);
    if (!text(field.label) || !KEY.test(key) || keys.has(key)) {
      error(`Полето за избор „${name}“ трябва да има име и уникален ключ с малки латински букви, цифри и _.`);
    }
    keys.add(key);
    if (baseDelta === null) error(`Доплащането за поле „${name}“ трябва да е неотрицателно число с до два знака след десетичната запетая.`);
    if (field.required !== undefined && typeof field.required !== "boolean") error(`Проверете required за поле „${name}“. Очаква се true или false.`);
    if (!Array.isArray(field.options) || !field.options.length || field.options.length > 100) {
      error(`Полето за избор „${name}“ трябва да има между 1 и 100 опции.`);
      continue;
    }
    const values: ParsedOptionGroup["values"] = [];
    const valueKeys = new Set<string>();
    for (const [valueIndex, option] of field.options.entries()) {
      if (!record(option)) { error(`Невалидна опция #${valueIndex + 1} за „${name}“.`); continue; }
      const label = text(option.label);
      const sourceKey = text(option.value);
      const valueKey = sourceKey.replaceAll("-", "_");
      const priceDelta = money(option.price_delta);
      if (!label || !KEY.test(valueKey) || valueKeys.has(valueKey)) {
        error(`Опция #${valueIndex + 1} за „${name}“ трябва да има име и уникално value с латински букви, цифри, - или _.`);
      }
      valueKeys.add(valueKey);
      if (priceDelta === null || baseDelta === null || !Number.isFinite((priceDelta ?? 0) + (baseDelta ?? 0))) {
        error(`Доплащането за опция „${label || valueIndex + 1}“ трябва да е неотрицателно число с до два знака след десетичната запетая.`);
      }
      if (option.price !== undefined) error(`За опция „${label || valueIndex + 1}“ използвайте price_delta (доплащане), а не price (крайна цена).`);
      if (option.is_default !== undefined && typeof option.is_default !== "boolean") error(`Проверете is_default за опция „${label || valueIndex + 1}“.`);
      values.push({ id: null, label, key: valueKey, priceDelta: Math.round(((priceDelta ?? 0) + (baseDelta ?? 0)) * 100) / 100,
        isDefault: option.is_default === true, isActive: true, isSoldOut: false, imageUrl: null, materialId: null, sku: null, sortOrder: valueIndex });
    }
    if (values.filter(value => value.isDefault).length > 1) error(`Полето „${name}“ може да има само една опция по подразбиране.`);
    groups.push({ id: null, name, key, inputType: "single", imageDisplaySize: "medium", isRequired: field.required === true,
      minSelect: field.required === true ? 1 : 0, maxSelect: 1, sortOrder: index, isActive: true, pricingMode: "delta",
      dependsOnOptionId: null, placeholder: text(field.placeholder) || null, maxLength: null, textPriceDelta: 0, values });
  }
  for (const field of fields) {
    if (record(field) && keys.has(text(field.field_key))) error(`Ключът „${text(field.field_key)}“ се повтаря между поле за избор и поле за персонализация.`);
  }
  return { fields, groups, errors };
}
