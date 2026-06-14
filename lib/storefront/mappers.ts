import type { Product } from "@/lib/catalog";
import { applyAvailabilityToProduct } from "@/lib/product-fulfillment";
import type { ProductFulfillmentType } from "@/lib/product-fulfillment";
import { normalizeProductCardBadge } from "@/lib/product-card";
import {
  resolveProductPricing,
  type ProductPromotionRow,
} from "@/lib/product-pricing";
import { getCategoryImageSrc } from "@/lib/category-images";
import type { ShopCategory } from "@/lib/shop-categories";
import type { StorefrontCategory } from "@/lib/storefront/types";

export const DEFAULT_PRODUCT_IMAGE =
  "";

export const DEFAULT_CATEGORY_IMAGE =
  "";

export type ProductRow = {
  id: string;
  slug: string;
  product_code: string;
  name: string;
  description: string;
  additional_info?: string | null;
  fulfillment_note?: string | null;
  price: number;
  image_url: string | null;
  is_customizable: boolean;
  is_sold_out?: boolean;
  fulfillment_type?: ProductFulfillmentType;
  stock_quantity?: number | null;
  card_badge?: string | null;
};

export type ProductImageRow = {
  id: string;
  product_id: string;
  image_url: string;
  alt_text: string | null;
  sort_order: number;
  is_primary: boolean;
};

export function toProduct(
  row: ProductRow,
  imageRows: ProductImageRow[] = [],
  promotion?: ProductPromotionRow | null,
): Product {
  const images = [...imageRows]
    .sort((a, b) => {
      if (a.is_primary !== b.is_primary) {
        return a.is_primary ? -1 : 1;
      }
      return a.sort_order - b.sort_order;
    })
    .map((image) => ({
      src: image.image_url,
      alt: image.alt_text || row.name,
    }));

  const basePrice = Number(row.price);
  const pricing = resolveProductPricing(basePrice, promotion ?? null);

  return applyAvailabilityToProduct({
    id: row.id,
    slug: row.slug,
    productCode: row.product_code,
    title: row.name,
    description: row.description,
    additionalInfo: row.additional_info,
    fulfillmentNote: row.fulfillment_note,
    price: pricing.price,
    compareAtPrice: pricing.compareAtPrice,
    promotion: pricing.promotion,
    cardBadge: normalizeProductCardBadge(row.card_badge),
    customizable: row.is_customizable,
    soldOut: Boolean(row.is_sold_out),
    fulfillmentType: row.fulfillment_type ?? "made_to_order",
    stockQuantity: row.stock_quantity ?? null,
    images:
      images.length > 0
        ? images
        : [{ src: row.image_url ?? DEFAULT_PRODUCT_IMAGE, alt: row.name }],
  });
}

export function toShowcaseCategory(category: StorefrontCategory): ShopCategory {
  const imageSrc = getCategoryImageSrc(category.slug, category.category_type);
  const categoryLabel =
    category.category_type === "occasion" ? "повод" : "вид продукт";

  return {
    id: category.id,
    slug: category.slug,
    title: category.name,
    categoryType: category.category_type,
    parentId: category.parent_id,
    imageSrc: imageSrc || DEFAULT_CATEGORY_IMAGE,
    imageAlt: `${category.name} - ${categoryLabel}`,
    cardDescription: category.card_description,
  };
}
