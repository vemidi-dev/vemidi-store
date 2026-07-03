import type { SupabaseClient } from "@supabase/supabase-js";

import type { Product } from "@/lib/catalog";
import { isProductUpsellTargetVisible } from "@/lib/product-visibility";
import {
  isProductStorefrontPublished,
  normalizeProductPublicationStatus,
} from "@/lib/product-publication";
import {
  toProduct,
  type ProductImageRow,
  type ProductRow,
} from "@/lib/storefront/mappers";

export type ProductUpsellOfferRow = {
  id: string;
  source_product_id: string;
  upsell_product_id: string;
  offer_title: string | null;
  offer_description: string | null;
  special_price: number;
  suggested_quantity: number;
  max_quantity: number;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at?: string | null;
};

export type ProductUpsellOffer = {
  id: string;
  sourceProductId: string;
  upsellProductId: string;
  title: string | null;
  description: string | null;
  specialPrice: number;
  suggestedQuantity: number;
  maxQuantity: number;
  sortOrder: number;
  product: Product;
};

export function normalizeUpsellQuantity(value: unknown, fallback = 1): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(1, Math.trunc(parsed)) : fallback;
}

export function mapProductUpsellOffer(
  row: ProductUpsellOfferRow,
  product: Product,
): ProductUpsellOffer {
  const maxQuantity = normalizeUpsellQuantity(row.max_quantity);
  const suggestedQuantity = Math.min(
    normalizeUpsellQuantity(row.suggested_quantity),
    maxQuantity,
  );

  return {
    id: row.id,
    sourceProductId: row.source_product_id,
    upsellProductId: row.upsell_product_id,
    title: row.offer_title?.trim() || null,
    description: row.offer_description?.trim() || null,
    specialPrice: Math.max(0, Number(row.special_price) || 0),
    suggestedQuantity,
    maxQuantity,
    sortOrder: Number(row.sort_order) || 0,
    product,
  };
}

export function isEligibleUpsellProduct(row: ProductRow): boolean {
  const status = normalizeProductPublicationStatus(row.status, "draft");
  return (
    isProductStorefrontPublished(status) &&
    isProductUpsellTargetVisible(row.visibility)
  );
}

export async function getActiveProductUpsellOffers(
  supabase: SupabaseClient,
  sourceProductId: string,
): Promise<ProductUpsellOffer[]> {
  const { data: offerRows, error: offersError } = await supabase
    .from("product_upsell_offers")
    .select(
      "id,source_product_id,upsell_product_id,offer_title,offer_description,special_price,suggested_quantity,max_quantity,sort_order,is_active,created_at,updated_at",
    )
    .eq("source_product_id", sourceProductId)
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (offersError || !offerRows?.length) {
    return [];
  }

  const offers = offerRows as ProductUpsellOfferRow[];
  const productIds = [...new Set(offers.map((offer) => offer.upsell_product_id))];

  const [productsResult, imagesResult] = await Promise.all([
    supabase
      .from("products")
      .select(
        "id,slug,product_code,name,heading_subtitle,subtitle,description,additional_info,fulfillment_note,personalization_info,dimensions_materials,ordering_info,price,image_url,is_customizable,is_sold_out,fulfillment_type,stock_quantity,card_badge,status,visibility",
      )
      .in("id", productIds),
    supabase
      .from("product_images")
      .select("id,product_id,image_url,alt_text,sort_order,is_primary")
      .in("product_id", productIds)
      .order("sort_order", { ascending: true }),
  ]);

  if (productsResult.error) {
    return [];
  }

  const imagesByProductId = new Map<string, ProductImageRow[]>();
  ((imagesResult.data ?? []) as ProductImageRow[]).forEach((image) => {
    const images = imagesByProductId.get(image.product_id) ?? [];
    images.push(image);
    imagesByProductId.set(image.product_id, images);
  });

  const productById = new Map(
    ((productsResult.data ?? []) as ProductRow[])
      .filter(isEligibleUpsellProduct)
      .map((row) => [row.id, toProduct(row, imagesByProductId.get(row.id) ?? [])]),
  );

  return offers.flatMap((offer) => {
    const product = productById.get(offer.upsell_product_id);
    return product ? [mapProductUpsellOffer(offer, product)] : [];
  });
}
