"use client";

import { useEffect, useRef } from "react";

import { trackMetaInitiateCheckout } from "@/lib/consent/meta-pixel-client";

type MetaPixelInitiateCheckoutBridgeProps = {
  lines: Array<{ slug: string; quantity: number; price: number }>;
  subtotal: number;
};

export function MetaPixelInitiateCheckoutBridge({
  lines,
  subtotal,
}: MetaPixelInitiateCheckoutBridgeProps) {
  const trackedRef = useRef(false);

  useEffect(() => {
    if (trackedRef.current || lines.length === 0) {
      return;
    }

    trackedRef.current = true;
    trackMetaInitiateCheckout({ lines, subtotal });
  }, [lines, subtotal]);

  return null;
}
