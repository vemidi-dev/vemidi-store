import type { Product } from "@/lib/catalog";

export type StorefrontCategory = {
  id: string;
  name: string;
  slug: string;
  category_type: "product" | "occasion";
  parent_id: string | null;
  image_url?: string | null;
  image_alt?: string | null;
  cover_image_url?: string | null;
  cover_image_alt?: string | null;
  show_on_home: boolean;
  home_sort_order: number;
  card_description: string | null;
  createdAt: string | null;
};

export type StorefrontProduct = Product & {
  categorySlugs: string[];
  updatedAt: string | null;
  createdAt: string | null;
};

export type StorefrontCatalog = {
  categories: StorefrontCategory[];
  products: StorefrontProduct[];
  featuredProductIds: string[];
  relatedProductIdsByProductId: Map<string, string[]>;
};
