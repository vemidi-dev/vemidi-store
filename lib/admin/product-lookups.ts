import type { SupabaseClient } from "@supabase/supabase-js";

import type {
  CategoryRow,
  ColorGroupRow,
  ColorOptionRow,
  ProductMaterialRow,
  ProductVariantGroupRow,
  WishTemplateOccasionRow,
  WishTemplateRow,
} from "@/lib/admin/types";
import type { FaqGroupRow, FaqItemRow } from "@/lib/faq/types";
import {
  loadProductMaterials,
  loadProductVariantGroups,
} from "@/lib/admin/variant-data";

const CATEGORY_SELECT =
  "id,name,slug,category_type,parent_id,image_url,image_alt,cover_image_url,cover_image_alt,show_on_home,home_sort_order,card_description,is_visible,hero_description,listing_heading,intro_text,seo_body,meta_title,meta_description,og_title,og_description,robots_index";

export type AdminProductLookups = {
  categories: CategoryRow[];
  colorGroups: ColorGroupRow[];
  colorOptions: ColorOptionRow[];
  materials: ProductMaterialRow[];
  variantGroups: ProductVariantGroupRow[];
  wishTemplates: WishTemplateRow[];
  wishTemplateOccasions: WishTemplateOccasionRow[];
  faqProductGroups: FaqGroupRow[];
  faqItems: FaqItemRow[];
  errors: {
    categories: { message: string } | null;
    colorGroups: { message: string } | null;
    colorOptions: { message: string } | null;
    materials: { message: string } | null;
    variantGroups: { message: string } | null;
    wishTemplates: { message: string } | null;
    wishTemplateOccasions: { message: string } | null;
    faqGroups: { message: string } | null;
    faqItems: { message: string } | null;
  };
};

/** Lookups for product create + list filter dropdowns (no per-product children). */
export async function loadAdminProductLookups(
  supabase: SupabaseClient,
): Promise<AdminProductLookups> {
  const [
    categoriesResult,
    colorGroupsResult,
    colorOptionsResult,
    wishTemplatesResult,
    wishOccasionsResult,
    faqGroupsResult,
    faqItemsResult,
  ] = await Promise.all([
    supabase
      .from("categories")
      .select(CATEGORY_SELECT)
      .order("category_type", { ascending: true })
      .order("home_sort_order", { ascending: true })
      .order("name", { ascending: true }),
    supabase.from("color_groups").select("id,key,label").order("label", { ascending: true }),
    supabase
      .from("color_options")
      .select("id,group_id,name,hex,sort_order,is_active")
      .eq("is_active", true)
      .order("sort_order", { ascending: true }),
    supabase
      .from("wish_templates")
      .select("id,title,body,is_active,sort_order")
      .eq("is_active", true)
      .order("sort_order", { ascending: true }),
    supabase.from("wish_template_occasions").select("wish_template_id,category_id"),
    supabase
      .from("faq_groups")
      .select("id,name,slug,scope,is_active,sort_order,created_at,updated_at")
      .eq("scope", "product")
      .order("sort_order", { ascending: true }),
    supabase
      .from("faq_items")
      .select("id,question,answer,is_active,sort_order,created_at,updated_at")
      .order("sort_order", { ascending: true }),
  ]);

  const variantGroupsLoaded = await loadProductVariantGroups(supabase);
  const materialsLoaded = await loadProductMaterials(
    supabase,
    variantGroupsLoaded.groups,
  );

  return {
    categories: (categoriesResult.data ?? []) as CategoryRow[],
    colorGroups: (colorGroupsResult.data ?? []) as ColorGroupRow[],
    colorOptions: (colorOptionsResult.data ?? []) as ColorOptionRow[],
    materials: materialsLoaded.materials,
    variantGroups: variantGroupsLoaded.groups,
    wishTemplates: (wishTemplatesResult.data ?? []) as WishTemplateRow[],
    wishTemplateOccasions: (wishOccasionsResult.data ??
      []) as WishTemplateOccasionRow[],
    faqProductGroups: (faqGroupsResult.data ?? []) as FaqGroupRow[],
    faqItems: (faqItemsResult.data ?? []) as FaqItemRow[],
    errors: {
      categories: categoriesResult.error
        ? { message: categoriesResult.error.message }
        : null,
      colorGroups: colorGroupsResult.error
        ? { message: colorGroupsResult.error.message }
        : null,
      colorOptions: colorOptionsResult.error
        ? { message: colorOptionsResult.error.message }
        : null,
      materials: materialsLoaded.error ? { message: materialsLoaded.error } : null,
      variantGroups: variantGroupsLoaded.error
        ? { message: variantGroupsLoaded.error }
        : null,
      wishTemplates: wishTemplatesResult.error
        ? { message: wishTemplatesResult.error.message }
        : null,
      wishTemplateOccasions: wishOccasionsResult.error
        ? { message: wishOccasionsResult.error.message }
        : null,
      faqGroups: faqGroupsResult.error
        ? { message: faqGroupsResult.error.message }
        : null,
      faqItems: faqItemsResult.error ? { message: faqItemsResult.error.message } : null,
    },
  };
}
