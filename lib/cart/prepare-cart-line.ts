import {
  buildCampaignAttribution,
  mergeCampaignAttribution,
  type CampaignAttribution,
} from "@/lib/campaign-attribution";
import { makeCartLineId } from "@/lib/cart-line-id";
import { buildCartLineDisplaySnapshot } from "@/lib/cart/build-cart-line-display";
import { normalizePersonalization } from "@/lib/cart-storage";
import { normalizeCartQuantityWithLimit } from "@/lib/cart/quantity-limits";
import { applyQuantityTierPricesForProduct } from "@/lib/cart/update-cart-line-quantity";
import type { CartLine, CartLineUpsell } from "@/lib/cart-types";
import type { Product } from "@/lib/catalog";
import {
  calculateEstimatedUnitPrice,
  calculateOptionDelta,
} from "@/lib/product-option-pricing";
import { resolveQuantityUnitPrice } from "@/lib/product-quantity-pricing";
import type { ProductOptionSelection } from "@/lib/product-options";
import type { SelectedProductColor } from "@/lib/product-colors";
import type { ProductPersonalizationValue } from "@/lib/product-personalization";
import { calculatePersonalizationDelta } from "@/lib/product-personalization";

export type PrepareCartLineInput = {
  product: Product;
  quantity: number;
  personalization?: string;
  selectedColors?: SelectedProductColor[];
  personalizationFields?: ProductPersonalizationValue[];
  attribution?: CampaignAttribution;
  optionSelections?: ProductOptionSelection[];
  unitPriceOverride?: number;
  maxCartQuantityOverride?: number;
  upsell?: CartLineUpsell;
};

export type PreparedCartLine = {
  line: CartLine;
  lineId: string;
  normalizedQuantity: number;
  storedAttribution?: CampaignAttribution;
};

export function prepareCartLineInput(
  input: PrepareCartLineInput,
): PreparedCartLine | null {
  const normalizedQuantity = normalizeCartQuantityWithLimit(
    input.quantity,
    input.maxCartQuantityOverride ?? input.product.maxCartQuantity,
  );

  if (
    normalizedQuantity === 0 ||
    !Number.isFinite(input.product.price) ||
    input.product.price < 0 ||
    !input.product.orderable
  ) {
    return null;
  }

  const storedPersonalization = normalizePersonalization(input.personalization);
  const storedColors = input.selectedColors?.length ? input.selectedColors : undefined;
  const storedPersonalizationFields = input.personalizationFields?.length
    ? input.personalizationFields
    : undefined;
  const storedOptionSelections = input.optionSelections?.length
    ? input.optionSelections
    : undefined;
  const storedAttribution = buildCampaignAttribution(input.attribution ?? {});
  const quantityBasePrice = resolveQuantityUnitPrice(
    input.product.price,
    input.product.quantityPriceTiers,
    normalizedQuantity,
  );
  const optionDelta = input.product.optionGroups?.length
    ? calculateOptionDelta(input.product.optionGroups, storedOptionSelections ?? [])
    : 0;
  const personalizationDelta = calculatePersonalizationDelta(
    input.product.personalizationFields,
    storedPersonalizationFields,
  );
  const optionPrice = input.product.optionGroups?.length
    ? calculateEstimatedUnitPrice(
        quantityBasePrice,
        input.product.optionGroups,
        storedOptionSelections ?? [],
      )
    : quantityBasePrice;
  const estimatedPrice =
    input.unitPriceOverride !== undefined
      ? Math.max(0, input.unitPriceOverride)
      : optionPrice + personalizationDelta;
  const lineId = makeCartLineId(
    input.product.id,
    storedPersonalization,
    storedColors,
    storedPersonalizationFields,
    storedOptionSelections,
    input.upsell
      ? {
          upsellOfferId: input.upsell.offerId,
          upsellSourceProductId: input.upsell.sourceProductId,
        }
      : undefined,
  );
  const displaySnapshot = buildCartLineDisplaySnapshot({
    optionGroups: input.product.optionGroups,
    optionSelections: storedOptionSelections,
  });

  return {
    lineId,
    normalizedQuantity,
    storedAttribution,
    line: {
      lineId,
      productId: input.product.id,
      slug: input.product.slug,
      title: input.product.title,
      imageSrc: input.product.images.find((image) => image.src)?.src,
      price: estimatedPrice,
      baseUnitPrice: input.product.price,
      optionDelta,
      personalizationDelta,
      quantityPriceTiers: input.product.quantityPriceTiers,
      quantity: normalizedQuantity,
      maxCartQuantity: input.maxCartQuantityOverride ?? input.product.maxCartQuantity,
      campaign: storedAttribution?.campaign,
      source: storedAttribution?.source,
      landingUrl: storedAttribution?.landingUrl,
      personalization: storedPersonalization,
      personalizationFields: storedPersonalizationFields,
      selectedColors: storedColors,
      optionSelections: storedOptionSelections,
      displaySnapshot,
      upsell: input.upsell,
    },
  };
}

export function mergeCartLineForAdd(
  existingLines: CartLine[],
  prepared: PreparedCartLine,
): CartLine[] {
  const existing = existingLines.find((line) => line.lineId === prepared.lineId);
  if (!existing) {
    return applyQuantityTierPricesForProduct(
      [...existingLines, prepared.line],
      prepared.line.productId,
    );
  }

  const mergedAttribution = mergeCampaignAttribution(
    buildCampaignAttribution({
      campaign: existing.campaign,
      source: existing.source,
      landingUrl: existing.landingUrl,
    }),
    prepared.storedAttribution,
  );

  return applyQuantityTierPricesForProduct(existingLines.map((line) => {
    if (line.lineId !== prepared.lineId) {
      return line;
    }

    const nextQuantity = normalizeCartQuantityWithLimit(
      line.quantity + prepared.normalizedQuantity,
      line.maxCartQuantity ?? prepared.line.maxCartQuantity,
    );

    return {
      ...line,
      campaign: mergedAttribution?.campaign ?? line.campaign,
      source: mergedAttribution?.source ?? line.source,
      landingUrl: mergedAttribution?.landingUrl ?? line.landingUrl,
      quantity: nextQuantity,
    };
  }), prepared.line.productId);
}

export function mergeCartLineForCampaignHandoff(
  existingLines: CartLine[],
  prepared: PreparedCartLine,
): CartLine[] {
  const existing = existingLines.find((line) => line.lineId === prepared.lineId);
  if (!existing) {
    return [...existingLines, prepared.line];
  }

  const mergedAttribution = mergeCampaignAttribution(
    buildCampaignAttribution({
      campaign: existing.campaign,
      source: existing.source,
      landingUrl: existing.landingUrl,
    }),
    prepared.storedAttribution,
  );

  return existingLines.map((line) => {
    if (line.lineId !== prepared.lineId) {
      return line;
    }

    return {
      ...line,
      campaign: mergedAttribution?.campaign ?? line.campaign,
      source: mergedAttribution?.source ?? line.source,
      landingUrl: mergedAttribution?.landingUrl ?? line.landingUrl,
    };
  });
}
