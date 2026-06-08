import type { Product } from "@/lib/catalog";

export type StorefrontCategory = {
  id: string;
  name: string;
  slug: string;
};

export type StorefrontProduct = Product & {
  categorySlugs: string[];
};

export type StorefrontCatalog = {
  categories: StorefrontCategory[];
  products: StorefrontProduct[];
};
