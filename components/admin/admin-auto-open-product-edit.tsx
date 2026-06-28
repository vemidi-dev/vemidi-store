"use client";

import { useEffect } from "react";

import { resolveProductEditScrollTargetId } from "@/lib/admin/product-edit-navigation";

type AdminAutoOpenProductEditProps = {
  productId?: string;
};

export function AdminAutoOpenProductEdit({ productId }: AdminAutoOpenProductEditProps) {
  useEffect(() => {
    if (!productId) {
      return;
    }

    const details = document.getElementById(`product-edit-${productId}`);
    if (details instanceof HTMLDetailsElement) {
      details.open = true;
    }

    const scrollTargetId = resolveProductEditScrollTargetId(
      productId,
      window.location.hash,
    );
    const scrollTarget =
      document.getElementById(scrollTargetId) ??
      (details instanceof HTMLElement ? details : null);

    scrollTarget?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [productId]);

  return null;
}
