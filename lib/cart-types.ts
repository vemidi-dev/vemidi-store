import type { Product } from "@/lib/catalog";

export type CartLine = {
  slug: Product["slug"];
  title: string;
  price: number;
  quantity: number;
};

export const CART_STORAGE_KEY = "lumaforge-cart-v1";
