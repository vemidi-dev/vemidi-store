"use client";

import { useEffect } from "react";

import { scheduleProductEditScrollRestore } from "@/lib/admin/product-edit-scroll-restore";

type AdminAutoOpenProductEditProps = {
  productId?: string;
};

export function AdminAutoOpenProductEdit({ productId }: AdminAutoOpenProductEditProps) {
  useEffect(() => {
    if (!productId) {
      return;
    }

    return scheduleProductEditScrollRestore(productId, window.location.hash);
  }, [productId]);

  return null;
}
