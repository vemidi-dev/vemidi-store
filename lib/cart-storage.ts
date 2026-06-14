import { normalizeCartQuantityWithLimit } from "@/lib/cart/quantity-limits";
import { isUuid } from "@/lib/is-uuid";
import { makeCartLineId } from "@/lib/cart-line-id";
import {
  normalizeCampaignCode,
  normalizeCampaignSource,
  normalizeLandingUrl,
} from "@/lib/campaign-attribution";
import type { CartLine } from "@/lib/cart-types";
import { sanitizeOptionSelectionsInput } from "@/lib/product-option-validation";
import type { SelectedProductColor } from "@/lib/product-colors";
import type { ProductPersonalizationValue } from "@/lib/product-personalization";

export const MAX_CART_QUANTITY = 99;
export const PERSONALIZATION_MAX_LENGTH = 1000;
export const PERSONALIZATION_FIELD_MAX_COUNT = 20;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function parseSelectedColor(value: unknown): SelectedProductColor | null {
  if (!isRecord(value)) {
    return null;
  }

  const groupId = value.groupId;
  const groupKey = value.groupKey;
  const groupLabel = value.groupLabel;
  const optionId = value.optionId;
  const optionName = value.optionName;
  const optionHex = value.optionHex;

  if (
    typeof groupId !== "string" ||
    typeof groupKey !== "string" ||
    typeof groupLabel !== "string" ||
    typeof optionId !== "string" ||
    typeof optionName !== "string" ||
    (typeof optionHex !== "string" && optionHex !== null)
  ) {
    return null;
  }

  return {
    fieldId: typeof value.fieldId === "string" ? value.fieldId : groupId,
    fieldLabel: typeof value.fieldLabel === "string" ? value.fieldLabel : groupLabel,
    groupId,
    groupKey,
    groupLabel,
    optionId,
    optionName,
    optionHex,
  };
}

function parsePersonalizationField(
  value: unknown,
): ProductPersonalizationValue | null {
  if (!isRecord(value)) {
    return null;
  }

  const fieldId = typeof value.fieldId === "string" ? value.fieldId.trim() : "";
  const fieldKey = typeof value.fieldKey === "string" ? value.fieldKey.trim() : "";
  const label = typeof value.label === "string" ? value.label.trim() : "";
  const fieldValue = typeof value.value === "string" ? value.value.trim() : "";

  if (!fieldId || !fieldKey || !label || !fieldValue) {
    return null;
  }

  return {
    fieldId: fieldId.slice(0, 100),
    fieldKey: fieldKey.slice(0, 100),
    label: label.slice(0, 200),
    value: fieldValue.slice(0, PERSONALIZATION_MAX_LENGTH),
  };
}

export function normalizeCartQuantity(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.min(MAX_CART_QUANTITY, Math.max(0, Math.floor(value)));
}

export function normalizePersonalization(value?: string): string | undefined {
  const normalized = value?.trim().slice(0, PERSONALIZATION_MAX_LENGTH);
  return normalized || undefined;
}

export function parseStoredCart(raw: string | null): CartLine[] {
  if (!raw) {
    return [];
  }

  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }

    const lines: CartLine[] = [];

    for (const value of parsed) {
      if (!isRecord(value)) {
        continue;
      }

      const legacySlug =
        typeof value.slug === "string" ? value.slug.trim() : "";
      const explicitProductId =
        typeof value.productId === "string" ? value.productId.trim() : "";
      const productId =
        explicitProductId || (isUuid(legacySlug) ? legacySlug : "");
      const slug =
        typeof value.slug === "string" && value.slug.trim() && !isUuid(value.slug)
          ? value.slug.trim()
          : legacySlug;
      const { title, price } = value;
      const imageSrc =
        typeof value.imageSrc === "string" && value.imageSrc.trim()
          ? value.imageSrc.trim().slice(0, 2000)
          : undefined;
      const quantity =
        typeof value.quantity === "number"
          ? normalizeCartQuantity(value.quantity)
          : 0;
      const maxCartQuantity =
        typeof value.maxCartQuantity === "number" &&
        Number.isFinite(value.maxCartQuantity) &&
        value.maxCartQuantity >= 0
          ? Math.floor(value.maxCartQuantity)
          : undefined;
      const cappedQuantity = normalizeCartQuantityWithLimit(quantity, maxCartQuantity);

      if (
        !productId ||
        !isUuid(productId) ||
        typeof title !== "string" ||
        !title ||
        typeof price !== "number" ||
        !Number.isFinite(price) ||
        price < 0 ||
        quantity === 0 ||
        cappedQuantity === 0
      ) {
        continue;
      }

      const personalization =
        typeof value.personalization === "string"
          ? normalizePersonalization(value.personalization)
          : undefined;
      const campaign = normalizeCampaignCode(value.campaign);
      const source = normalizeCampaignSource(value.source);
      const landingUrl = normalizeLandingUrl(
        typeof value.landingUrl === "string" ? value.landingUrl : undefined,
      );
      const personalizationFields = Array.isArray(value.personalizationFields)
        ? value.personalizationFields
            .slice(0, PERSONALIZATION_FIELD_MAX_COUNT)
            .map(parsePersonalizationField)
            .filter(
              (field): field is ProductPersonalizationValue => field !== null,
            )
        : undefined;
      const normalizedPersonalizationFields = personalizationFields?.length
        ? personalizationFields
        : undefined;
      const selectedColors = Array.isArray(value.selectedColors)
        ? value.selectedColors
            .map(parseSelectedColor)
            .filter((color): color is SelectedProductColor => color !== null)
        : undefined;
      const normalizedColors = selectedColors?.length ? selectedColors : undefined;
      const optionSelections = sanitizeOptionSelectionsInput(value.optionSelections);
      const normalizedOptionSelections = optionSelections.length
        ? optionSelections
        : undefined;

      lines.push({
        lineId: makeCartLineId(
          productId,
          personalization,
          normalizedColors,
          normalizedPersonalizationFields,
          normalizedOptionSelections,
        ),
        productId,
        slug: slug || productId,
        title,
        imageSrc,
        price,
        quantity: cappedQuantity,
        ...(maxCartQuantity !== undefined ? { maxCartQuantity } : {}),
        campaign,
        source,
        landingUrl,
        personalization,
        personalizationFields: normalizedPersonalizationFields,
        selectedColors: normalizedColors,
        optionSelections: normalizedOptionSelections,
      });
    }

    return lines;
  } catch {
    return [];
  }
}

export function getCartTotals(lines: CartLine[]) {
  return lines.reduce(
    (totals, line) => ({
      itemCount: totals.itemCount + line.quantity,
      subtotal: totals.subtotal + line.price * line.quantity,
    }),
    { itemCount: 0, subtotal: 0 },
  );
}
