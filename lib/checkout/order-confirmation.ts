export const ORDER_CONFIRMATION_STORAGE_KEY = "vemidi:order-confirmation-v1";
export const PURCHASE_STORAGE_KEY = "vemidi:last-purchase";

export type OrderConfirmationPayload = {
  orderRef: string;
  issuedAt: number;
};

export type PurchaseAnalyticsContentItem = {
  id: string;
  quantity: number;
  item_price?: number;
};

export type PurchaseAnalyticsPayload = {
  value: number;
  currency: string;
  itemCount: number;
  /** Non-PII product identifiers (storefront slugs). */
  contentIds?: string[];
  contents?: PurchaseAnalyticsContentItem[];
  /** Short public order reference — safe for Meta `eventID` / future CAPI dedup. */
  orderRef?: string;
};

export function formatOrderReference(orderId: string): string {
  const normalized = orderId.replace(/-/g, "").slice(0, 8).toUpperCase();
  return normalized || "ORDER";
}

export function createOrderConfirmationPayload(orderId: string): OrderConfirmationPayload {
  return {
    orderRef: formatOrderReference(orderId),
    issuedAt: Date.now(),
  };
}

export function parseOrderConfirmationPayload(
  raw: string | null,
  maxAgeMs = 30 * 60 * 1000,
): OrderConfirmationPayload | null {
  if (!raw) {
    return null;
  }

  try {
    const value = JSON.parse(raw) as Partial<OrderConfirmationPayload>;
    if (
      typeof value.orderRef !== "string" ||
      !value.orderRef.trim() ||
      typeof value.issuedAt !== "number" ||
      !Number.isFinite(value.issuedAt)
    ) {
      return null;
    }

    if (Date.now() - value.issuedAt > maxAgeMs) {
      return null;
    }

    return {
      orderRef: value.orderRef.trim(),
      issuedAt: value.issuedAt,
    };
  } catch {
    return null;
  }
}

export function parsePurchaseAnalyticsPayload(
  raw: string | null,
): PurchaseAnalyticsPayload | null {
  if (!raw) {
    return null;
  }

  try {
    const value = JSON.parse(raw) as Partial<PurchaseAnalyticsPayload>;
    if (
      typeof value.value !== "number" ||
      !Number.isFinite(value.value) ||
      value.value < 0 ||
      typeof value.currency !== "string" ||
      !value.currency ||
      typeof value.itemCount !== "number" ||
      !Number.isFinite(value.itemCount) ||
      value.itemCount < 1
    ) {
      return null;
    }

    const contentIds = Array.isArray(value.contentIds)
      ? value.contentIds
          .filter((id): id is string => typeof id === "string" && Boolean(id.trim()))
          .map((id) => id.trim())
      : undefined;

    const contents = Array.isArray(value.contents)
      ? value.contents
          .filter(
            (item): item is PurchaseAnalyticsContentItem =>
              Boolean(item) &&
              typeof item === "object" &&
              typeof (item as PurchaseAnalyticsContentItem).id === "string" &&
              Boolean((item as PurchaseAnalyticsContentItem).id.trim()) &&
              typeof (item as PurchaseAnalyticsContentItem).quantity === "number" &&
              Number.isFinite((item as PurchaseAnalyticsContentItem).quantity),
          )
          .map((item) => ({
            id: item.id.trim(),
            quantity: Math.max(1, Math.floor(item.quantity)),
            ...(typeof item.item_price === "number" && Number.isFinite(item.item_price)
              ? { item_price: item.item_price }
              : {}),
          }))
      : undefined;

    const orderRef =
      typeof value.orderRef === "string" && value.orderRef.trim()
        ? value.orderRef.trim()
        : undefined;

    return {
      value: value.value,
      currency: value.currency,
      itemCount: Math.floor(value.itemCount),
      ...(contentIds && contentIds.length > 0 ? { contentIds } : {}),
      ...(contents && contents.length > 0 ? { contents } : {}),
      ...(orderRef ? { orderRef } : {}),
    };
  } catch {
    return null;
  }
}
