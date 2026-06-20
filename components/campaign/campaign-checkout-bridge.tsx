"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

import { useCart } from "@/components/cart/cart-provider";
import { CAMPAIGN_ATTRIBUTION_SESSION_KEY } from "@/lib/cart-types";
import {
  resolveCampaignHandoffLineId,
  resolveCampaignHandoffRedirectGate,
} from "@/lib/cart/campaign-handoff-cart";
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
  const { ready, lines, ensureCampaignHandoffLine } = useCart();
  const router = useRouter();
  const handled = useRef(false);

  useEffect(() => {
    if (!ready || handled.current) {
      return;
    }

    const handoffInput = {
      product,
      quantity,
      personalization,
      selectedColors,
      personalizationFields,
      attribution,
      optionSelections,
    };
    const lineId = resolveCampaignHandoffLineId(handoffInput);
    const previousSignature = window.sessionStorage.getItem(CAMPAIGN_HANDOFF_SESSION_KEY);
    const gate = resolveCampaignHandoffRedirectGate({
      handoffSignature,
      previousSignature,
      lineId,
      lines,
    });

    if (gate.action === "wait") {
      return;
    }

    if (gate.action === "redirect") {
      handled.current = true;
      persistAttribution(attribution);
      router.replace("/checkout");
      return;
    }

    const ensureResult = ensureCampaignHandoffLine(handoffInput);
    if (!ensureResult.ok || !ensureResult.persisted) {
      return;
    }

    handled.current = true;
    window.sessionStorage.setItem(CAMPAIGN_HANDOFF_SESSION_KEY, handoffSignature);
    persistAttribution(attribution);
    router.replace("/checkout");
  }, [
    attribution,
    ensureCampaignHandoffLine,
    handoffSignature,
    lines,
    optionSelections,
    personalization,
    personalizationFields,
    product,
    quantity,
    ready,
    router,
    selectedColors,
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
