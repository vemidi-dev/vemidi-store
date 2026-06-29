import type { CookieConsentPreferences } from "@/lib/consent/types";

export const META_PIXEL_CURRENCY = "EUR";

export type MetaPixelEcommercePayload = {
  content_ids: string[];
  content_type: "product";
  content_name?: string;
  value?: number;
  currency: string;
  num_items?: number;
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

export function buildMetaViewContentPayload(input: {
  slug: string;
  title: string;
  price: number;
}): MetaPixelEcommercePayload {
  return {
    content_ids: [input.slug],
    content_type: "product",
    content_name: input.title,
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
  const quantity = Math.max(1, Math.trunc(input.quantity));

  return {
    content_ids: [input.slug],
    content_type: "product",
    content_name: input.title,
    value: input.price * quantity,
    currency: META_PIXEL_CURRENCY,
    num_items: quantity,
  };
}

export function buildMetaInitiateCheckoutPayload(input: {
  lines: Array<{ slug: string; quantity: number; price: number }>;
  subtotal: number;
}): MetaPixelEcommercePayload {
  return {
    content_ids: input.lines.map((line) => line.slug),
    content_type: "product",
    value: input.subtotal,
    currency: META_PIXEL_CURRENCY,
    num_items: input.lines.reduce((total, line) => total + line.quantity, 0),
  };
}

export type MetaPixelPurchasePayload = {
  value: number;
  currency: string;
  num_items: number;
};

export function buildMetaPurchasePayload(input: {
  value: number;
  currency: string;
  itemCount: number;
}): MetaPixelPurchasePayload {
  return {
    value: input.value,
    currency: input.currency,
    num_items: input.itemCount,
  };
}
