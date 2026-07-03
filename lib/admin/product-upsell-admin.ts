import type { SupabaseClient } from "@supabase/supabase-js";

import { adminFormFields } from "@/lib/admin/form-fields";
import type { ProductUpsellOfferRow } from "@/lib/storefront/product-upsells";

export type ParsedProductUpsellOffer = {
  upsellProductId: string;
  offerTitle: string | null;
  offerDescription: string | null;
  specialPrice: number;
  suggestedQuantity: number;
  maxQuantity: number;
  sortOrder: number;
};

function getArray(formData: FormData, key: string) {
  return formData.getAll(key).map((value) => String(value ?? "").trim());
}

function parseQuantity(value: string, fallback: number) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 1 ? parsed : fallback;
}

function parsePrice(value: string) {
  if (!value.trim()) {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

export function parseProductUpsellOffersFromFormData(formData: FormData): {
  offers: ParsedProductUpsellOffer[];
  error: string | null;
} {
  const targetIds = getArray(formData, adminFormFields.product.upsellTargetIds);
  const enabledIds = new Set(
    getArray(formData, adminFormFields.product.upsellEnabledIds),
  );
  const titles = getArray(formData, adminFormFields.product.upsellTitles);
  const descriptions = getArray(
    formData,
    adminFormFields.product.upsellDescriptions,
  );
  const prices = getArray(formData, adminFormFields.product.upsellSpecialPrices);
  const suggestedQuantities = getArray(
    formData,
    adminFormFields.product.upsellSuggestedQuantities,
  );
  const maxQuantities = getArray(
    formData,
    adminFormFields.product.upsellMaxQuantities,
  );

  const offers: ParsedProductUpsellOffer[] = [];
  const seen = new Set<string>();

  targetIds.forEach((targetId, index) => {
    if (!targetId || !enabledIds.has(targetId) || seen.has(targetId)) {
      return;
    }
    seen.add(targetId);

    const specialPrice = parsePrice(prices[index] ?? "");
    if (specialPrice === null) {
      offers.push({
        upsellProductId: targetId,
        offerTitle: null,
        offerDescription: null,
        specialPrice: Number.NaN,
        suggestedQuantity: 1,
        maxQuantity: 1,
        sortOrder: index,
      });
      return;
    }

    const maxQuantity = parseQuantity(maxQuantities[index] ?? "", 1);
    const suggestedQuantity = parseQuantity(
      suggestedQuantities[index] ?? "",
      Math.min(1, maxQuantity),
    );

    offers.push({
      upsellProductId: targetId,
      offerTitle: titles[index]?.trim() || null,
      offerDescription: descriptions[index]?.trim() || null,
      specialPrice,
      suggestedQuantity: Math.min(suggestedQuantity, maxQuantity),
      maxQuantity,
      sortOrder: index,
    });
  });

  const hasInvalidPrice = offers.some((offer) => !Number.isFinite(offer.specialPrice));
  if (hasInvalidPrice) {
    return {
      offers: [],
      error: "Въведете валидна специална цена за всяко избрано upsell предложение.",
    };
  }

  return { offers, error: null };
}

export async function syncProductUpsellOffers(
  supabase: SupabaseClient,
  sourceProductId: string,
  offers: ParsedProductUpsellOffer[],
): Promise<string | null> {
  const { error: deleteError } = await supabase
    .from("product_upsell_offers")
    .delete()
    .eq("source_product_id", sourceProductId);

  if (deleteError) {
    return deleteError.message.includes("product_upsell_offers")
      ? "Липсва миграцията product_upsell_offers.sql в Supabase."
      : "Upsell предложенията не бяха обновени.";
  }

  if (offers.length === 0) {
    return null;
  }

  const { data: products, error: productError } = await supabase
    .from("products")
    .select("id")
    .in(
      "id",
      offers.map((offer) => offer.upsellProductId),
    );

  if (productError) {
    return "Upsell продуктите не бяха проверени.";
  }

  const validProductIds = new Set((products ?? []).map((product) => String(product.id)));
  const invalidTarget = offers.find(
    (offer) =>
      offer.upsellProductId === sourceProductId ||
      !validProductIds.has(offer.upsellProductId),
  );
  if (invalidTarget) {
    return "Избрано е невалидно upsell предложение.";
  }

  const { error: insertError } = await supabase.from("product_upsell_offers").insert(
    offers.map((offer) => ({
      source_product_id: sourceProductId,
      upsell_product_id: offer.upsellProductId,
      offer_title: offer.offerTitle,
      offer_description: offer.offerDescription,
      special_price: offer.specialPrice,
      suggested_quantity: offer.suggestedQuantity,
      max_quantity: offer.maxQuantity,
      sort_order: offer.sortOrder,
      is_active: true,
    })),
  );

  if (insertError) {
    return insertError.message.includes("product_upsell_offers")
      ? "Липсва миграцията product_upsell_offers.sql в Supabase."
      : "Upsell предложенията не бяха записани.";
  }

  return null;
}

export function buildProductUpsellOfferMap(
  rows: ProductUpsellOfferRow[],
): Map<string, ProductUpsellOfferRow[]> {
  const byProductId = new Map<string, ProductUpsellOfferRow[]>();
  rows.forEach((row) => {
    const offers = byProductId.get(row.source_product_id) ?? [];
    offers.push(row);
    byProductId.set(row.source_product_id, offers);
  });
  return byProductId;
}
