import type { Product } from "@/lib/catalog";
import type { ProductOptionSelection } from "@/lib/product-options";
import type { SelectedProductColor } from "@/lib/product-colors";
import type { ProductPersonalizationValue } from "@/lib/product-personalization";

export type CartLine = {
  lineId: string;
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
};

export type CartLineAttribution = Pick<CartLine, "campaign" | "source" | "landingUrl">;

/** Bump when cart shape / currency changes. */
export const CART_STORAGE_KEY = "lumaforge-cart-v9-eur";

/** Previous cart key — parsed on first load for backward-compatible migration. */
export const LEGACY_CART_STORAGE_KEY = "lumaforge-cart-v8-eur";

export const CAMPAIGN_ATTRIBUTION_SESSION_KEY = "vemidi:campaign-attribution-v1";
