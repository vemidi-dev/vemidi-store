import type { SupabaseClient } from "@supabase/supabase-js";

import { buildProductCountByCategoryId } from "@/lib/admin/category-stats";
import type {
  CategoryRelatedCategoryRow,
  CategoryRow,
  ProductCategoryRow,
} from "@/lib/admin/types";

const CATEGORY_SELECT =
  "id,name,slug,category_type,parent_id,image_url,image_alt,cover_image_url,cover_image_alt,show_on_home,home_sort_order,card_description,is_visible,hero_description,listing_heading,intro_text,seo_body,meta_title,meta_description,og_title,og_description,robots_index";

export type AdminCategoriesData = {
  categories: CategoryRow[];
  productCountByCategoryId: Map<string, number>;
  relatedCategoryIdsByCategoryId: Map<string, string[]>;
  errors: {
    categories: { message: string } | null;
    productCategories: { message: string } | null;
    categoryRelatedCategories: { message: string } | null;
  };
};

/** Lightweight loader for /admin?tab=categories — never uses loadAdminData. */
export async function loadAdminCategoriesData(
  supabase: SupabaseClient,
): Promise<AdminCategoriesData> {
  const [categoriesResult, productCategoriesResult, relatedResult] =
    await Promise.all([
      supabase
        .from("categories")
        .select(CATEGORY_SELECT)
        .order("category_type", { ascending: true })
        .order("home_sort_order", { ascending: true })
        .order("name", { ascending: true }),
      supabase.from("product_categories").select("product_id,category_id"),
      supabase
        .from("category_related_categories")
        .select("category_id,related_category_id,sort_order")
        .order("sort_order", { ascending: true }),
    ]);

  const productCategories = (productCategoriesResult.data ??
    []) as ProductCategoryRow[];
  const categoryIdsByProductId = new Map<string, string[]>();
  for (const row of productCategories) {
    const ids = categoryIdsByProductId.get(row.product_id) ?? [];
    ids.push(row.category_id);
    categoryIdsByProductId.set(row.product_id, ids);
  }

  const relatedCategoryIdsByCategoryId = new Map<string, string[]>();
  for (const row of (relatedResult.data ?? []) as CategoryRelatedCategoryRow[]) {
    const ids = relatedCategoryIdsByCategoryId.get(row.category_id) ?? [];
    ids.push(row.related_category_id);
    relatedCategoryIdsByCategoryId.set(row.category_id, ids);
  }

  return {
    categories: (categoriesResult.data ?? []) as CategoryRow[],
    productCountByCategoryId: buildProductCountByCategoryId(categoryIdsByProductId),
    relatedCategoryIdsByCategoryId,
    errors: {
      categories: categoriesResult.error
        ? { message: categoriesResult.error.message }
        : null,
      productCategories: productCategoriesResult.error
        ? { message: productCategoriesResult.error.message }
        : null,
      categoryRelatedCategories: relatedResult.error
        ? { message: relatedResult.error.message }
        : null,
    },
  };
}
