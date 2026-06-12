import type { Product } from "@/lib/catalog";

export type StorefrontCategory = {
  id: string;
  name: string;
  slug: string;
  category_type: "product" | "occasion";
  show_on_home: boolean;
  home_sort_order: number;
  card_description: string | null;
};

export type StorefrontProduct = Product & {
  categorySlugs: string[];
};

export type StorefrontCatalog = {
  categories: StorefrontCategory[];
  products: StorefrontProduct[];
  featuredProductIds: string[];
  relatedProductIdsByProductId: Map<string, string[]>;
};
