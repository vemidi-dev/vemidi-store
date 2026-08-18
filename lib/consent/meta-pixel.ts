import type { CookieConsentPreferences } from "@/lib/consent/types";

export const META_PIXEL_CURRENCY = "EUR";

export type MetaPixelContentItem = {
  id: string;
  quantity: number;
  item_price?: number;
};

export type MetaPixelEcommercePayload = {
  content_ids: string[];
  content_type: "product";
  content_name?: string;
  contents?: MetaPixelContentItem[];
  value?: number;
  currency: string;
  num_items?: number;
};

export type MetaPixelPurchasePayload = {
  value: number;
  currency: string;
  num_items: number;
  content_ids: string[];
  content_type: "product";
  contents?: MetaPixelContentItem[];
};

export function getMetaPixelId(): string | undefined {
  const pixelId = process.env.NEXT_PUBLIC_META_PIXEL_ID?.trim();
  return pixelId || undefined;
}

export function shouldLoadMetaPixel(
  preferences: CookieConsentPreferences | null,
  pixelId: string | undefined = getMetaPixelId(),
): boolean {
  return Boolean(pixelId && preferences?.marketing === true);
}

export function canSendMetaPixelEvent(
  preferences: CookieConsentPreferences | null,
  pixelId: string | undefined = getMetaPixelId(),
  fbqAvailable = false,
): boolean {
  return shouldLoadMetaPixel(preferences, pixelId) && fbqAvailable;
}

function normalizeQuantity(value: number): number {
  return Math.max(1, Math.trunc(value));
}

export function buildMetaViewContentPayload(input: {
  slug: string;
  title: string;
  price: number;
}): MetaPixelEcommercePayload {
  return {
    content_ids: [input.slug],
    content_type: "product",
    content_name: input.title,
    contents: [
      {
        id: input.slug,
        quantity: 1,
        item_price: input.price,
      },
    ],
    value: input.price,
    currency: META_PIXEL_CURRENCY,
  };
}

export function buildMetaAddToCartPayload(input: {
  slug: string;
  title: string;
  price: number;
  quantity: number;
}): MetaPixelEcommercePayload {
  const quantity = normalizeQuantity(input.quantity);

  return {
    content_ids: [input.slug],
    content_type: "product",
    content_name: input.title,
    contents: [
      {
        id: input.slug,
        quantity,
        item_price: input.price,
      },
    ],
    value: input.price * quantity,
    currency: META_PIXEL_CURRENCY,
    num_items: quantity,
  };
}

export function buildMetaInitiateCheckoutPayload(input: {
  lines: Array<{ slug: string; quantity: number; price: number }>;
  subtotal: number;
}): MetaPixelEcommercePayload {
  const contents = input.lines.map((line) => ({
    id: line.slug,
    quantity: normalizeQuantity(line.quantity),
    item_price: line.price,
  }));

  return {
    content_ids: contents.map((item) => item.id),
    content_type: "product",
    contents,
    value: input.subtotal,
    currency: META_PIXEL_CURRENCY,
    num_items: contents.reduce((total, item) => total + item.quantity, 0),
  };
}

export function buildMetaPurchasePayload(input: {
  value: number;
  currency: string;
  itemCount: number;
  contentIds?: string[];
  contents?: MetaPixelContentItem[];
}): MetaPixelPurchasePayload {
  const contentIds =
    input.contentIds?.filter((id) => typeof id === "string" && id.trim()) ?? [];
  const contents =
    input.contents
      ?.filter((item) => item && typeof item.id === "string" && item.id.trim())
      .map((item) => ({
        id: item.id.trim(),
        quantity: normalizeQuantity(item.quantity),
        ...(typeof item.item_price === "number" && Number.isFinite(item.item_price)
          ? { item_price: item.item_price }
          : {}),
      })) ?? undefined;

  return {
    value: input.value,
    currency: input.currency || META_PIXEL_CURRENCY,
    num_items: Math.max(1, Math.floor(input.itemCount)),
    content_ids: contentIds.map((id) => id.trim()),
    content_type: "product",
    ...(contents && contents.length > 0 ? { contents } : {}),
  };
}

/** Non-PII event id helper for future CAPI dedup (browser Pixel `eventID`). */
export function resolveMetaPurchaseEventId(
  orderRef: string | null | undefined,
): string | undefined {
  if (typeof orderRef !== "string") {
    return undefined;
  }
  const trimmed = orderRef.trim();
  return trimmed || undefined;
}

export function assertNoPiiInMetaPayload(
  payload: Record<string, unknown>,
): string[] {
  const forbidden = [
    "email",
    "phone",
    "address",
    "customer_email",
    "customer_phone",
    "customer_name",
    "first_name",
    "last_name",
    "em",
    "ph",
  ];
  return forbidden.filter((key) => key in payload);
}
