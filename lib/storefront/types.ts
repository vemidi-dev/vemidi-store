import type { Product } from "@/lib/catalog";

export type StorefrontCategory = {
  id: string;
  name: string;
  slug: string;
  category_type: "product" | "occasion";
};

export type StorefrontProduct = Product & {
  categorySlugs: string[];
};

export type StorefrontCatalog = {
  categories: StorefrontCategory[];
  products: StorefrontProduct[];
};
