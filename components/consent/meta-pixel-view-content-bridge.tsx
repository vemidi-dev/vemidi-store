"use client";

import { useEffect, useRef } from "react";

import { trackMetaViewContent } from "@/lib/consent/meta-pixel-client";

type MetaPixelViewContentBridgeProps = {
  catalogProductId: string;
  title: string;
  price: number;
};

export function MetaPixelViewContentBridge({
  catalogProductId,
  title,
  price,
}: MetaPixelViewContentBridgeProps) {
  const trackedProductIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (trackedProductIdRef.current === catalogProductId) {
      return;
    }

    trackedProductIdRef.current = catalogProductId;
    trackMetaViewContent({ catalogProductId, title, price });
  }, [catalogProductId, title, price]);

  return null;
}
