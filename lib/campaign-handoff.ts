import {
  buildCampaignAttribution,
  normalizeCampaignCode,
  type CampaignAttribution,
} from "@/lib/campaign-attribution";
import {
  isValidOptionKey,
  resolveHandoffOptionSelections,
} from "@/lib/campaign-option-keys";
import { normalizeCartQuantity } from "@/lib/cart-storage";
import type { Product } from "@/lib/catalog";
import type { ProductOptionSelection } from "@/lib/product-options";
import { validateProductOptionSelections } from "@/lib/product-option-validation";
import type { SelectedProductColor } from "@/lib/product-colors";
import type { ProductPersonalizationValue } from "@/lib/product-personalization";

export const BLOCKED_HANDOFF_QUERY_KEYS = new Set([
  "price",
  "discount",
  "total",
  "compareatprice",
  "compare_at_price",
  "promo",
  "promotion",
  "token",
  "email",
  "phone",
  "name",
]);

export type CampaignHandoffQuery = {
  productId: string;
  campaign?: string;
  source?: string;
  landingUrl?: string;
  quantity: number;
  colorOptionIdsByFieldId: Map<string, string>;
  personalizationByFieldKey: Map<string, string>;
  optionSelections: ProductOptionSelection[];
  optionValueKeysByGroupKey: Map<string, string[]>;
  optionTextByGroupKey: Map<string, string>;
  unknownKeys: string[];
};

export type CampaignHandoffSuccess = {
  status: "ready";
  product: Product;
  quantity: number;
  selectedColors: SelectedProductColor[];
  optionSelections?: ProductOptionSelection[];
  personalization?: string;
  personalizationFields?: ProductPersonalizationValue[];
  attribution: CampaignAttribution;
};

export type CampaignHandoffNeedsConfiguration = {
  status: "needs_configuration";
  product: Product;
  redirectPath: string;
  missing: string[];
  selectedColors: SelectedProductColor[];
  optionSelections: ProductOptionSelection[];
  personalizationFields: ProductPersonalizationValue[];
};

export type CampaignHandoffInvalid = {
  status: "invalid";
  title: string;
  message: string;
};

export type CampaignHandoffResult =
  | CampaignHandoffSuccess
  | CampaignHandoffNeedsConfiguration
  | CampaignHandoffInvalid;

function firstQueryValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

function sanitizePersonalizationValue(value: string, maxLength: number) {
  return value
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .trim()
    .slice(0, maxLength);
}

function decodeQueryValue(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export function parseCampaignHandoffQuery(
  query: Record<string, string | string[] | undefined>,
): CampaignHandoffQuery {
  const unknownKeys: string[] = [];
  const colorOptionIdsByFieldId = new Map<string, string>();
  const personalizationByFieldKey = new Map<string, string>();
  const optionValueIdsByGroupId = new Map<string, string[]>();
  const optionTextByGroupId = new Map<string, string>();
  const optionValueKeysByGroupKey = new Map<string, string[]>();
  const optionTextByGroupKey = new Map<string, string>();

  for (const [key, rawValue] of Object.entries(query)) {
    const normalizedKey = key.trim().toLowerCase();
    const value = firstQueryValue(rawValue).trim();

    if (!value) {
      continue;
    }

    if (normalizedKey.startsWith("color_")) {
      const fieldId = key.slice("color_".length);
      if (isUuid(fieldId) && isUuid(value)) {
        colorOptionIdsByFieldId.set(fieldId, value);
      } else {
        unknownKeys.push(key);
      }
      continue;
    }

    if (normalizedKey.startsWith("pf_")) {
      const fieldKey = key.slice("pf_".length).trim().slice(0, 100);
      if (fieldKey) {
        personalizationByFieldKey.set(
          fieldKey,
          sanitizePersonalizationValue(decodeQueryValue(value), 1000),
        );
      }
      continue;
    }

    if (normalizedKey.startsWith("opt_text_")) {
      const groupId = key.slice("opt_text_".length);
      if (isUuid(groupId)) {
        optionTextByGroupId.set(
          groupId,
          sanitizePersonalizationValue(decodeQueryValue(value), 1000),
        );
      } else {
        unknownKeys.push(key);
      }
      continue;
    }

    if (normalizedKey.startsWith("opt_")) {
      const groupId = key.slice("opt_".length);
      if (!isUuid(groupId)) {
        unknownKeys.push(key);
        continue;
      }
      const valueIds = value
        .split(",")
        .map((part) => part.trim())
        .filter((part) => isUuid(part));
      if (valueIds.length === 0) {
        unknownKeys.push(key);
      } else {
        optionValueIdsByGroupId.set(groupId, valueIds);
      }
      continue;
    }

    if (normalizedKey.startsWith("option_text_")) {
      const groupKey = key.slice("option_text_".length);
      if (!isValidOptionKey(groupKey)) {
        unknownKeys.push(key);
        continue;
      }
      if (optionTextByGroupKey.has(groupKey)) {
        unknownKeys.push(key);
        continue;
      }
      optionTextByGroupKey.set(
        groupKey,
        sanitizePersonalizationValue(decodeQueryValue(value), 1000),
      );
      continue;
    }

    if (normalizedKey.startsWith("option_")) {
      const groupKey = key.slice("option_".length);
      if (!isValidOptionKey(groupKey)) {
        unknownKeys.push(key);
        continue;
      }
      const valueKeys = value
        .split(",")
        .map((part) => part.trim())
        .filter(Boolean);
      if (valueKeys.length === 0) {
        unknownKeys.push(key);
        continue;
      }
      if (optionValueKeysByGroupKey.has(groupKey)) {
        unknownKeys.push(key);
        continue;
      }
      optionValueKeysByGroupKey.set(groupKey, valueKeys);
      continue;
    }

    if (
      !["product", "campaign", "source", "quantity", "qty", "landing", "landing_url"].includes(
        normalizedKey,
      )
    ) {
      if (BLOCKED_HANDOFF_QUERY_KEYS.has(normalizedKey)) {
        unknownKeys.push(key);
      } else if (!normalizedKey.startsWith("utm_")) {
        unknownKeys.push(key);
      }
    }
  }

  const quantityRaw = Number(
    firstQueryValue(query.quantity) || firstQueryValue(query.qty) || "1",
  );

  return {
    productId: firstQueryValue(query.product).trim(),
    campaign: normalizeCampaignCode(firstQueryValue(query.campaign)),
    source: firstQueryValue(query.source).trim() || undefined,
    landingUrl:
      firstQueryValue(query.landing) || firstQueryValue(query.landing_url) || undefined,
    quantity: normalizeCartQuantity(quantityRaw) || 1,
    colorOptionIdsByFieldId,
    personalizationByFieldKey,
    optionSelections: [
      ...[...optionValueIdsByGroupId.entries()].map(([groupId, valueIds]) => ({
        groupId,
        valueIds,
      })),
      ...[...optionTextByGroupId.entries()].map(([groupId, textValue]) => ({
        groupId,
        valueIds: [] as string[],
        textValue,
      })),
    ],
    optionValueKeysByGroupKey,
    optionTextByGroupKey,
    unknownKeys,
  };
}

function buildSelectedColors(
  product: Product,
  colorOptionIdsByFieldId: Map<string, string>,
): { selected: SelectedProductColor[]; unknown: boolean } {
  const selected: SelectedProductColor[] = [];
  const colorFields = product.colorFields ?? [];

  for (const [fieldId, optionId] of colorOptionIdsByFieldId) {
    const field = colorFields.find((candidate) => candidate.id === fieldId);
    if (!field) {
      return { selected: [], unknown: true };
    }

    const option = field.options.find((candidate) => candidate.id === optionId);
    if (!option) {
      return { selected: [], unknown: true };
    }

    selected.push({
      fieldId: field.id,
      fieldLabel: field.label,
      groupId: field.groupId,
      groupKey: field.key,
      groupLabel: field.groupLabel,
      optionId: option.id,
      optionName: option.name,
      optionHex: option.hex,
    });
  }

  return { selected, unknown: false };
}

function buildPersonalizationFields(
  product: Product,
  personalizationByFieldKey: Map<string, string>,
): { fields: ProductPersonalizationValue[]; unknown: boolean } {
  const definitions = product.personalizationFields ?? [];
  const fields: ProductPersonalizationValue[] = [];

  for (const [fieldKey, value] of personalizationByFieldKey) {
    const definition = definitions.find((field) => field.key === fieldKey);
    if (!definition) {
      return { fields: [], unknown: true };
    }

    fields.push({
      fieldId: definition.id,
      fieldKey: definition.key,
      label: definition.label,
      value: sanitizePersonalizationValue(value, definition.maxLength),
    });
  }

  return { fields, unknown: false };
}

function getMissingRequirements(
  product: Product,
  selectedColors: SelectedProductColor[],
  personalizationFields: ProductPersonalizationValue[],
  optionSelections: ProductOptionSelection[],
) {
  const missing: string[] = [];
  const selectedByField = new Map<string, number>();

  selectedColors.forEach((color) => {
    selectedByField.set(color.fieldId, (selectedByField.get(color.fieldId) ?? 0) + 1);
  });

  for (const field of product.colorFields ?? []) {
    const count = selectedByField.get(field.id) ?? 0;
    if (count < field.minSelect) {
      missing.push(`цвят: ${field.label}`);
    }
  }

  for (const field of product.personalizationFields ?? []) {
    const value = personalizationFields.find((entry) => entry.fieldId === field.id)?.value ?? "";
    if (field.required && !value.trim()) {
      missing.push(`персонализация: ${field.label}`);
    }
  }

  const optionValidation = validateProductOptionSelections(
    product.id,
    product.optionGroups ?? [],
    optionSelections,
  );
  if (!optionValidation.ok && optionValidation.code === "required_option_missing") {
    missing.push("универсални опции");
  }

  if (
    product.customizable &&
    !(product.personalizationFields?.length) &&
    personalizationFields.length === 0 &&
    selectedColors.length === 0 &&
    !(product.optionGroups?.length)
  ) {
    missing.push("персонализация");
  }

  return missing;
}

export function buildCampaignProductRedirectPath(
  product: Product,
  attribution?: CampaignAttribution,
  optionSelections: ProductOptionSelection[] = [],
) {
  const params = new URLSearchParams();
  if (attribution?.campaign) {
    params.set("campaign", attribution.campaign);
  }
  if (attribution?.source) {
    params.set("source", attribution.source);
  }
  if (attribution?.landingUrl) {
    params.set("landing", attribution.landingUrl);
  }
  for (const selection of optionSelections) {
    if (selection.valueIds.length > 0) {
      params.set(`opt_${selection.groupId}`, selection.valueIds.join(","));
    }
  }

  return `/produkti/${encodeURIComponent(product.slug)}${
    params.size ? `?${params.toString()}` : ""
  }`;
}

export function getCampaignProductPageOptionSelections(
  product: Product,
  rawQuery: Record<string, string | string[] | undefined>,
) {
  const query = parseCampaignHandoffQuery(rawQuery);
  if (query.unknownKeys.length > 0) {
    return [];
  }

  const resolved = resolveHandoffOptionSelections(product, {
    optionSelections: query.optionSelections.filter(
      (selection) => selection.valueIds.length > 0,
    ),
    optionValueKeysByGroupKey: query.optionValueKeysByGroupKey,
    optionTextByGroupKey: new Map(),
  });

  return resolved.ok ? resolved.selections : [];
}

export function evaluateCampaignHandoff(
  product: Product | null,
  query: CampaignHandoffQuery,
): CampaignHandoffResult {
  if (query.unknownKeys.length > 0) {
    return {
      status: "invalid",
      title: "Невалидна кампанийна връзка",
      message:
        "Връзката съдържа непозволени параметри. Моля, използвайте официалния бутон от landing страницата.",
    };
  }

  if (!query.productId || !isUuid(query.productId)) {
    return {
      status: "invalid",
      title: "Продуктът не е намерен",
      message: "Не успяхме да открием продукта за тази кампания. Проверете линка от landing страницата.",
    };
  }

  if (!product || !product.orderable) {
    return {
      status: "invalid",
      title: "Продуктът не е наличен",
      message: "Избраният продукт в момента не може да бъде поръчан от тази кампания.",
    };
  }

  const attribution = buildCampaignAttribution({
    source: query.source,
    campaign: query.campaign,
    landingUrl: query.landingUrl,
  });

  if (!attribution) {
    return {
      status: "invalid",
      title: "Липсва кампания",
      message: "Връзката трябва да съдържа валиден кампанийен идентификатор.",
    };
  }

  const colorResult = buildSelectedColors(product, query.colorOptionIdsByFieldId);
  if (colorResult.unknown) {
    return {
      status: "invalid",
      title: "Невалидна опция",
      message: "Подадена е опция, която не съществува за този продукт.",
    };
  }

  const personalizationResult = buildPersonalizationFields(
    product,
    query.personalizationByFieldKey,
  );
  if (personalizationResult.unknown) {
    return {
      status: "invalid",
      title: "Невалидна персонализация",
      message: "Подадена е персонализация, която не е позволена за този продукт.",
    };
  }

  const resolvedOptions = resolveHandoffOptionSelections(product, {
    optionSelections: query.optionSelections,
    optionValueKeysByGroupKey: query.optionValueKeysByGroupKey,
    optionTextByGroupKey: query.optionTextByGroupKey,
  });
  if (!resolvedOptions.ok) {
    return {
      status: "invalid",
      title: "Невалидна опция",
      message: resolvedOptions.message,
    };
  }

  const optionValidation = validateProductOptionSelections(
    product.id,
    product.optionGroups ?? [],
    resolvedOptions.selections,
  );
  if (!optionValidation.ok && optionValidation.code !== "required_option_missing") {
    return {
      status: "invalid",
      title: "Невалидна опция",
      message: optionValidation.message,
    };
  }

  const hasOptionModel =
    Boolean(product.colorFields?.length) ||
    Boolean(product.personalizationFields?.length) ||
    Boolean(product.optionGroups?.length) ||
    Boolean(product.customizable);

  const missing = getMissingRequirements(
    product,
    colorResult.selected,
    personalizationResult.fields,
    optionValidation.ok ? optionValidation.selections : resolvedOptions.selections,
  );

  if (hasOptionModel && missing.length > 0) {
    return {
      status: "needs_configuration",
      product,
      redirectPath: buildCampaignProductRedirectPath(
        product,
        attribution,
        resolvedOptions.selections,
      ),
      missing,
      selectedColors: colorResult.selected,
      optionSelections: resolvedOptions.selections,
      personalizationFields: personalizationResult.fields,
    };
  }

  const legacyPersonalization = personalizationResult.fields
    .map((field) => field.value)
    .join("\n")
    .trim();

  return {
    status: "ready",
    product,
    quantity: query.quantity,
    selectedColors: colorResult.selected,
    optionSelections: optionValidation.ok ? optionValidation.selections : undefined,
    personalization: legacyPersonalization || undefined,
    personalizationFields: personalizationResult.fields.length
      ? personalizationResult.fields
      : undefined,
    attribution,
  };
}

export function buildCampaignHandoffSignature(result: CampaignHandoffSuccess) {
  return [
    result.product.id,
    result.quantity,
    result.attribution.source,
    result.attribution.campaign ?? "",
    result.attribution.landingUrl ?? "",
    result.selectedColors.map((color) => `${color.fieldId}:${color.optionId}`).join(","),
    result.optionSelections
      ?.map((selection) =>
        `${selection.groupId}:${selection.valueIds.join(",")}:${selection.textValue ?? ""}`,
      )
      .join(",") ?? "",
    result.personalizationFields?.map((field) => `${field.fieldKey}=${field.value}`).join(",") ?? "",
  ].join("|");
}
