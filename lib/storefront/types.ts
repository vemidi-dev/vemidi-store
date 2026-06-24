import type { Product } from "@/lib/catalog";

export type CategoryContentSeoFields = {
  hero_description?: string | null;
  listing_heading?: string | null;
  intro_text?: string | null;
  seo_body?: string | null;
  meta_title?: string | null;
  meta_description?: string | null;
  og_title?: string | null;
  og_description?: string | null;
  robots_index?: boolean | null;
};

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
  is_visible?: boolean;
  home_sort_order: number;
  card_description: string | null;
  createdAt: string | null;
} & CategoryContentSeoFields;

export type StorefrontProduct = Product & {
  categorySlugs: string[];
  primaryCategoryId: string | null;
  updatedAt: string | null;
  createdAt: string | null;
};

export type StorefrontCatalog = {
  categories: StorefrontCategory[];
  products: StorefrontProduct[];
  featuredProductIds: string[];
  relatedProductIdsByProductId: Map<string, string[]>;
};
