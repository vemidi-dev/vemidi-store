"use client";

import { useEffect } from "react";

import {
  parsePurchaseAnalyticsPayload,
  PURCHASE_STORAGE_KEY,
} from "@/lib/checkout/order-confirmation";

declare global {
  interface Window {
    dataLayer?: Array<Record<string, unknown>>;
  }
}

export function PurchaseEventBridge() {
  useEffect(() => {
    const purchase = parsePurchaseAnalyticsPayload(
      window.sessionStorage.getItem(PURCHASE_STORAGE_KEY),
    );
    window.sessionStorage.removeItem(PURCHASE_STORAGE_KEY);

    if (!purchase) return;

    const detail = {
      value: purchase.value,
      currency: purchase.currency,
      num_items: purchase.itemCount,
    };

    window.dataLayer?.push({ event: "purchase", ecommerce: detail });
    window.dispatchEvent(new CustomEvent("vemidi:purchase", { detail }));
  }, []);

  return null;
}
