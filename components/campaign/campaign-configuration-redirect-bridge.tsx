"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

import {
  getProductConfigurationDraftKey,
  mergeProductConfigurationDraft,
  parseProductConfigurationDraft,
  type ProductConfigurationDraft,
} from "@/lib/product-configuration-draft";
import type { ProductOptionSelection } from "@/lib/product-options";
import type { SelectedProductColor } from "@/lib/product-colors";
import type { ProductPersonalizationValue } from "@/lib/product-personalization";

type CampaignConfigurationRedirectBridgeProps = {
  productId: string;
  productTitle: string;
  redirectPath: string;
  optionSelections: ProductOptionSelection[];
  personalizationFields: ProductPersonalizationValue[];
  selectedColors: SelectedProductColor[];
};

const EMPTY_DRAFT: ProductConfigurationDraft = {
  values: {},
  enabledOptionalFieldIds: [],
  selectedColorOptionIdsByFieldId: {},
  optionSelections: [],
};

export function CampaignConfigurationRedirectBridge({
  productId,
  productTitle,
  redirectPath,
  optionSelections,
  personalizationFields,
  selectedColors,
}: CampaignConfigurationRedirectBridgeProps) {
  const router = useRouter();
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current) {
      return;
    }
    handled.current = true;

    try {
      const key = getProductConfigurationDraftKey(productId);
      const stored = parseProductConfigurationDraft(window.localStorage.getItem(key));
      const base = stored ?? EMPTY_DRAFT;
      window.localStorage.setItem(key, JSON.stringify(
        mergeProductConfigurationDraft(base, {
          optionSelections,
          personalizationFields,
          selectedColors,
        }) satisfies ProductConfigurationDraft,
      ));
    } finally {
      router.replace(redirectPath);
    }
  }, [
    optionSelections,
    personalizationFields,
    productId,
    redirectPath,
    router,
    selectedColors,
  ]);

  return (
    <section className="pb-24 pt-10">
      <div className="mx-auto max-w-2xl px-4">
        <div className="rounded-2xl border border-boutique-line bg-boutique-paper px-8 py-14 text-center shadow-boutique-sm">
          <h1 className="font-heading text-3xl text-boutique-ink">
            Довършете избора си
          </h1>
          <p className="mt-3 text-sm text-boutique-muted">
            Запазваме избраното за „{productTitle}“ и ви пренасочваме към липсващите опции.
          </p>
        </div>
      </div>
    </section>
  );
}
