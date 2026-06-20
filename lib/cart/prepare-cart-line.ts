import {
  buildCampaignAttribution,
  mergeCampaignAttribution,
  type CampaignAttribution,
} from "@/lib/campaign-attribution";
import { makeCartLineId } from "@/lib/cart-line-id";
import { buildCartLineDisplaySnapshot } from "@/lib/cart/build-cart-line-display";
import { normalizePersonalization } from "@/lib/cart-storage";
import { normalizeCartQuantityWithLimit } from "@/lib/cart/quantity-limits";
import type { CartLine } from "@/lib/cart-types";
import type { Product } from "@/lib/catalog";
import {
  calculateEstimatedUnitPrice,
} from "@/lib/product-option-pricing";
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
    input.product.maxCartQuantity,
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
  const optionPrice = input.product.optionGroups?.length
    ? calculateEstimatedUnitPrice(
        input.product.price,
        input.product.optionGroups,
        storedOptionSelections ?? [],
      )
    : input.product.price;
  const estimatedPrice =
    optionPrice +
    calculatePersonalizationDelta(
      input.product.personalizationFields,
      storedPersonalizationFields,
    );
  const lineId = makeCartLineId(
    input.product.id,
    storedPersonalization,
    storedColors,
    storedPersonalizationFields,
    storedOptionSelections,
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
      quantity: normalizedQuantity,
      maxCartQuantity: input.product.maxCartQuantity,
      campaign: storedAttribution?.campaign,
      source: storedAttribution?.source,
      landingUrl: storedAttribution?.landingUrl,
      personalization: storedPersonalization,
      personalizationFields: storedPersonalizationFields,
      selectedColors: storedColors,
      optionSelections: storedOptionSelections,
      displaySnapshot,
    },
  };
}

export function mergeCartLineForAdd(
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
      quantity: normalizeCartQuantityWithLimit(
        line.quantity + prepared.normalizedQuantity,
        line.maxCartQuantity ?? prepared.line.maxCartQuantity,
      ),
    };
  });
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
