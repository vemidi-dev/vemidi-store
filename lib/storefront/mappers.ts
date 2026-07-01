import type { Product } from "@/lib/catalog";
import { applyAvailabilityToProduct } from "@/lib/product-fulfillment";
import type { ProductFulfillmentType } from "@/lib/product-fulfillment";
import type { ProductPublicationStatus } from "@/lib/product-publication";
import { normalizeProductCardBadge } from "@/lib/product-card";
import {
  resolveProductPricing,
  type ProductPromotionRow,
} from "@/lib/product-pricing";
import { resolveCategoryCardImage } from "@/lib/category-image-resolution";
import type { CategoryRow } from "@/lib/admin/types";
import type { ShopCategory } from "@/lib/shop-categories";
import type { StorefrontCategory } from "@/lib/storefront/types";

export type { CategoryRow };

export const CATEGORY_STOREFRONT_SELECT =
  "id,name,slug,category_type,parent_id,image_url,image_alt,cover_image_url,cover_image_alt,show_on_home,home_sort_order,card_description,is_visible,hero_description,listing_heading,intro_text,seo_body,meta_title,meta_description,og_title,og_description,robots_index,created_at" as const;

export function mapStorefrontCategory(row: CategoryRow & { created_at?: string | null }): StorefrontCategory {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    category_type: row.category_type,
    parent_id: row.parent_id,
    image_url: row.image_url,
    image_alt: row.image_alt,
    cover_image_url: row.cover_image_url,
    cover_image_alt: row.cover_image_alt,
    show_on_home: row.show_on_home,
    is_visible: row.is_visible ?? true,
    home_sort_order: row.home_sort_order,
    card_description: row.card_description,
    hero_description: row.hero_description,
    listing_heading: row.listing_heading,
    intro_text: row.intro_text,
    seo_body: row.seo_body,
    meta_title: row.meta_title,
    meta_description: row.meta_description,
    og_title: row.og_title,
    og_description: row.og_description,
    robots_index: row.robots_index,
    createdAt: row.created_at ?? null,
  };
}

export const DEFAULT_PRODUCT_IMAGE =
  "";

export const DEFAULT_CATEGORY_IMAGE =
  "";

export type ProductRow = {
  id: string;
  slug: string;
  product_code: string;
  name: string;
  subtitle?: string | null;
  heading_subtitle?: string | null;
  description: string | null;
  additional_info?: string | null;
  fulfillment_note?: string | null;
  personalization_info?: string | null;
  dimensions_materials?: string | null;
  ordering_info?: string | null;
  price: number;
  image_url: string | null;
  is_customizable: boolean;
  is_sold_out?: boolean;
  fulfillment_type?: ProductFulfillmentType;
  stock_quantity?: number | null;
  card_badge?: string | null;
  primary_category_id?: string | null;
  meta_title?: string | null;
  meta_description?: string | null;
  og_title?: string | null;
  og_description?: string | null;
  status?: ProductPublicationStatus;
  created_at?: string | null;
  updated_at?: string | null;
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
    headingSubtitle: row.heading_subtitle ?? null,
    subtitle: row.subtitle ?? null,
    description: row.description ?? "",
    additionalInfo: row.additional_info,
    personalizationInfo: row.personalization_info ?? null,
    dimensionsMaterials: row.dimensions_materials ?? null,
    orderingInfo: row.ordering_info ?? null,
    fulfillmentNote: row.fulfillment_note,
    price: pricing.price,
    compareAtPrice: pricing.compareAtPrice,
    promotion: pricing.promotion,
    cardBadge: normalizeProductCardBadge(row.card_badge),
    meta_title: row.meta_title ?? null,
    meta_description: row.meta_description ?? null,
    og_title: row.og_title ?? null,
    og_description: row.og_description ?? null,
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
  const cardImage = resolveCategoryCardImage(category);
  const categoryLabel =
    category.category_type === "occasion" ? "повод" : "вид продукт";

  return {
    id: category.id,
    slug: category.slug,
    title: category.name,
    categoryType: category.category_type,
    parentId: category.parent_id,
    imageSrc: cardImage.src || DEFAULT_CATEGORY_IMAGE,
    imageAlt: cardImage.alt || `${category.name} - ${categoryLabel}`,
    cardDescription: category.card_description,
  };
}
