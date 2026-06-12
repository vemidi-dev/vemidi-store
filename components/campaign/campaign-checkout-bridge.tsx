"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

import { useCart } from "@/components/cart/cart-provider";
import { CAMPAIGN_ATTRIBUTION_SESSION_KEY } from "@/lib/cart-types";
import {
  CAMPAIGN_HANDOFF_SESSION_KEY,
  type CampaignAttribution,
} from "@/lib/campaign-attribution";
import type { Product } from "@/lib/catalog";
import type { ProductOptionSelection } from "@/lib/product-options";
import type { SelectedProductColor } from "@/lib/product-colors";
import type { ProductPersonalizationValue } from "@/lib/product-personalization";

type CampaignCheckoutBridgeProps = {
  attribution: CampaignAttribution;
  handoffSignature: string;
  product: Product;
  quantity: number;
  personalization?: string;
  personalizationFields?: ProductPersonalizationValue[];
  selectedColors?: SelectedProductColor[];
  optionSelections?: ProductOptionSelection[];
};

function persistAttribution(attribution: CampaignAttribution) {
  window.sessionStorage.setItem(CAMPAIGN_ATTRIBUTION_SESSION_KEY, JSON.stringify(attribution));
}

export function CampaignCheckoutBridge({
  attribution,
  handoffSignature,
  product,
  quantity,
  personalization,
  personalizationFields,
  selectedColors,
  optionSelections,
}: CampaignCheckoutBridgeProps) {
  const { addProduct } = useCart();
  const router = useRouter();
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current) {
      return;
    }

    const previousSignature = window.sessionStorage.getItem(CAMPAIGN_HANDOFF_SESSION_KEY);
    persistAttribution(attribution);

    if (previousSignature === handoffSignature) {
      handled.current = true;
      router.replace("/checkout");
      return;
    }

    handled.current = true;
    window.sessionStorage.setItem(CAMPAIGN_HANDOFF_SESSION_KEY, handoffSignature);

    addProduct(
      product,
      quantity,
      personalization,
      selectedColors,
      personalizationFields,
      attribution,
      optionSelections,
    );
    router.replace("/checkout");
  }, [
    addProduct,
    attribution,
    handoffSignature,
    personalization,
    personalizationFields,
    product,
    quantity,
    router,
    selectedColors,
    optionSelections,
  ]);

  return (
    <div className="rounded-2xl border border-boutique-line bg-boutique-paper px-8 py-14 text-center shadow-boutique-sm">
      <h1 className="font-heading text-3xl text-boutique-ink">
        Подготвяме поръчката
      </h1>
      <p className="mt-3 text-sm text-boutique-muted">
        Добавяме „{product.title}“ и ви пренасочваме към общия checkout на магазина.
      </p>
      {attribution.campaign ? (
        <p className="mt-2 text-xs text-boutique-muted">
          Кампания: {attribution.campaign}
        </p>
      ) : null}
    </div>
  );
}
