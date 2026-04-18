import type { Product } from "@/lib/catalog";
import type { SelectedProductColor } from "@/lib/product-colors";

export type CartLine = {
  lineId: string;
  slug: Product["slug"];
  title: string;
  price: number;
  quantity: number;
  personalization?: string;
  selectedColors?: SelectedProductColor[];
};

/** Bump when cart shape / currency changes. */
export const CART_STORAGE_KEY = "lumaforge-cart-v6-eur";
