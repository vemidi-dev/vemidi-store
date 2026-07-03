import type { Product } from "@/lib/catalog";
import type { ProductOptionSelection } from "@/lib/product-options";
import type { SelectedProductColor } from "@/lib/product-colors";
import type { ProductPersonalizationValue } from "@/lib/product-personalization";
import type { CartLineDisplaySnapshot } from "@/lib/cart/build-cart-line-display";

export type CartLineUpsell = {
  offerId: string;
  sourceProductId: Product["id"];
  sourceProductTitle: string;
  originalPrice: number;
  specialPrice: number;
};

export type CartLine = {
  lineId: string;
  /** Stable UUID identity for checkout and cart merging. */
  productId: Product["id"];
  /** Current SEO slug for storefront links. */
  slug: Product["slug"];
  title: string;
  imageSrc?: string;
  price: number;
  quantity: number;
  campaign?: string;
  source?: string;
  landingUrl?: string;
  personalization?: string;
  personalizationFields?: ProductPersonalizationValue[];
  selectedColors?: SelectedProductColor[];
  optionSelections?: ProductOptionSelection[];
  /** Customer-facing option labels captured at add-to-cart time. */
  displaySnapshot?: CartLineDisplaySnapshot;
  /** Snapshot of stocked quantity limit when the line was added. */
  maxCartQuantity?: number;
  /** Snapshot when the item was added from a product upsell offer. */
  upsell?: CartLineUpsell;
};

export type CartLineAttribution = Pick<CartLine, "campaign" | "source" | "landingUrl">;

/** Bump when cart shape / currency changes. */
export const CART_STORAGE_KEY = "lumaforge-cart-v10-eur";

/** Previous cart key — parsed on first load for backward-compatible migration. */
export const LEGACY_CART_STORAGE_KEY = "lumaforge-cart-v9-eur";

export const CAMPAIGN_ATTRIBUTION_SESSION_KEY = "vemidi:campaign-attribution-v1";
