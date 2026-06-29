"use client";

import { useEffect } from "react";

import {
  parsePurchaseAnalyticsPayload,
  PURCHASE_STORAGE_KEY,
} from "@/lib/checkout/order-confirmation";
import { trackGaPurchase } from "@/lib/consent/google-analytics-client";
import { trackMetaPurchase } from "@/lib/consent/meta-pixel-client";

declare global {
  interface Window {
    dataLayer?: Array<Record<string, unknown>>;
  }
}

export function PurchaseEventBridge() {
  useEffect(() => {
    const raw = window.sessionStorage.getItem(PURCHASE_STORAGE_KEY);
    window.sessionStorage.removeItem(PURCHASE_STORAGE_KEY);

    const purchase = parsePurchaseAnalyticsPayload(raw);
    if (!purchase) {
      return;
    }

    const detail = {
      value: purchase.value,
      currency: purchase.currency,
      num_items: purchase.itemCount,
    };

    window.dataLayer?.push({ event: "purchase", ecommerce: detail });
    window.dispatchEvent(new CustomEvent("vemidi:purchase", { detail }));

    trackGaPurchase(purchase);
    trackMetaPurchase(purchase);
  }, []);

  return null;
}
