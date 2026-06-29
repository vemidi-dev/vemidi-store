"use client";

import { useEffect, useRef } from "react";

import { trackMetaViewContent } from "@/lib/consent/meta-pixel-client";

type MetaPixelViewContentBridgeProps = {
  slug: string;
  title: string;
  price: number;
};

export function MetaPixelViewContentBridge({
  slug,
  title,
  price,
}: MetaPixelViewContentBridgeProps) {
  const trackedSlugRef = useRef<string | null>(null);

  useEffect(() => {
    if (trackedSlugRef.current === slug) {
      return;
    }

    trackedSlugRef.current = slug;
    trackMetaViewContent({ slug, title, price });
  }, [slug, title, price]);

  return null;
}
