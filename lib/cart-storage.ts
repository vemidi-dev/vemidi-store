import { makeCartLineId } from "@/lib/cart-line-id";
import type { CartLine } from "@/lib/cart-types";
import type { SelectedProductColor } from "@/lib/product-colors";

export const MAX_CART_QUANTITY = 99;
export const PERSONALIZATION_MAX_LENGTH = 50;

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

      const { slug, title, price } = value;
      const quantity =
        typeof value.quantity === "number" ? normalizeCartQuantity(value.quantity) : 0;

      if (
        typeof slug !== "string" ||
        !slug ||
        typeof title !== "string" ||
        !title ||
        typeof price !== "number" ||
        !Number.isFinite(price) ||
        price < 0 ||
        quantity === 0
      ) {
        continue;
      }

      const personalization =
        typeof value.personalization === "string"
          ? normalizePersonalization(value.personalization)
          : undefined;
      const selectedColors = Array.isArray(value.selectedColors)
        ? value.selectedColors
            .map(parseSelectedColor)
            .filter((color): color is SelectedProductColor => color !== null)
        : undefined;
      const normalizedColors = selectedColors?.length ? selectedColors : undefined;

      lines.push({
        lineId: makeCartLineId(slug, personalization, normalizedColors),
        slug,
        title,
        price,
        quantity,
        personalization,
        selectedColors: normalizedColors,
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
