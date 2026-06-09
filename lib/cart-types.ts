import type { Product } from "@/lib/catalog";
import type { SelectedProductColor } from "@/lib/product-colors";
import type { ProductPersonalizationValue } from "@/lib/product-personalization";

export type CartLine = {
  lineId: string;
  slug: Product["slug"];
  title: string;
  price: number;
  quantity: number;
  personalization?: string;
  personalizationFields?: ProductPersonalizationValue[];
  selectedColors?: SelectedProductColor[];
};

/** Bump when cart shape / currency changes. */
export const CART_STORAGE_KEY = "lumaforge-cart-v7-eur";
