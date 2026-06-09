"use client";

import { useEffect } from "react";

const PURCHASE_STORAGE_KEY = "vemidi:last-purchase";

type PurchaseData = {
  value: number;
  currency: string;
  itemCount: number;
};

declare global {
  interface Window {
    dataLayer?: Array<Record<string, unknown>>;
  }
}

function parsePurchaseData(raw: string | null): PurchaseData | null {
  if (!raw) return null;

  try {
    const value = JSON.parse(raw) as Partial<PurchaseData>;
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

    return {
      value: value.value,
      currency: value.currency,
      itemCount: Math.floor(value.itemCount),
    };
  } catch {
    return null;
  }
}

export function PurchaseEventBridge() {
  useEffect(() => {
    const purchase = parsePurchaseData(window.sessionStorage.getItem(PURCHASE_STORAGE_KEY));
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
