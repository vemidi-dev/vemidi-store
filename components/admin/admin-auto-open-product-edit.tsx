"use client";

import { useEffect } from "react";

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
      details.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [productId]);

  return null;
}
