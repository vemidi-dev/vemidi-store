import type { SupabaseClient } from "@supabase/supabase-js";

import type {
  CategoryRow,
  ColorGroupRow,
  ColorOptionRow,
  ProductCategoryRow,
  ProductColorFieldOptionRow,
  ProductColorFieldRow,
  ProductRow,
} from "@/lib/admin/types";

type QueryError = { message: string } | null;

export type AdminData = {
  products: ProductRow[];
  categories: CategoryRow[];
  colorGroups: ColorGroupRow[];
  colorOptions: ColorOptionRow[];
  categoryById: Map<string, CategoryRow>;
  categoryIdsByProductId: Map<string, string[]>;
  colorGroupById: Map<string, ColorGroupRow>;
  colorOptionById: Map<string, ColorOptionRow>;
  colorFieldsByProductId: Map<string, ProductColorFieldRow[]>;
  selectedColorOptionIdsByFieldId: Map<string, Set<string>>;
  errors: {
    products: QueryError;
    categories: QueryError;
    productCategories: QueryError;
    colorGroups: QueryError;
    colorOptions: QueryError;
    productColorFields: QueryError;
    productColorFieldOptions: QueryError;
  };
};

export async function loadAdminData(supabase: SupabaseClient): Promise<AdminData> {
  const [
    productsResult,
    categoriesResult,
    productCategoriesResult,
    colorGroupsResult,
    colorOptionsResult,
    productColorFieldsResult,
    productColorFieldOptionsResult,
  ] = await Promise.all([
    supabase.from("products").select("*").order("id", { ascending: false }),
    supabase
      .from("categories")
      .select("id,name,slug,category_type")
      .order("category_type", { ascending: true })
      .order("name", { ascending: true }),
    supabase.from("product_categories").select("product_id,category_id"),
    supabase.from("color_groups").select("id,key,label").order("label", { ascending: true }),
    supabase
      .from("color_options")
      .select("id,group_id,name,hex,sort_order,is_active")
      .eq("is_active", true)
      .order("sort_order", { ascending: true }),
    supabase
      .from("product_color_fields")
      .select("id,product_id,group_id,label,enabled,min_select,max_select,sort_order"),
    supabase.from("product_color_field_options").select("field_id,color_option_id"),
  ]);

  const products = (productsResult.data ?? []) as ProductRow[];
  const categories = (categoriesResult.data ?? []) as CategoryRow[];
  const productCategories = (productCategoriesResult.data ?? []) as ProductCategoryRow[];
  const colorGroups = (colorGroupsResult.data ?? []) as ColorGroupRow[];
  const colorOptions = (colorOptionsResult.data ?? []) as ColorOptionRow[];
  const productColorFields = (productColorFieldsResult.data ?? []) as ProductColorFieldRow[];
  const productColorFieldOptions = (productColorFieldOptionsResult.data ??
    []) as ProductColorFieldOptionRow[];

  const categoryById = new Map(categories.map((category) => [category.id, category]));
  const categoryIdsByProductId = new Map<string, string[]>();
  const colorGroupById = new Map(colorGroups.map((group) => [group.id, group]));
  const colorOptionById = new Map(colorOptions.map((option) => [option.id, option]));
  const colorFieldsByProductId = new Map<string, ProductColorFieldRow[]>();
  const selectedColorOptionIdsByFieldId = new Map<string, Set<string>>();

  productCategories.forEach((row) => {
    const categoryIds = categoryIdsByProductId.get(row.product_id) ?? [];
    categoryIds.push(row.category_id);
    categoryIdsByProductId.set(row.product_id, categoryIds);
  });

  productColorFields.forEach((field) => {
    const fields = colorFieldsByProductId.get(field.product_id) ?? [];
    fields.push(field);
    colorFieldsByProductId.set(field.product_id, fields);
  });

  colorFieldsByProductId.forEach((fields, productId) => {
    colorFieldsByProductId.set(
      productId,
      [...fields].sort((a, b) => {
        const sortDifference = a.sort_order - b.sort_order;
        return sortDifference || a.label.localeCompare(b.label, "bg");
      }),
    );
  });

  productColorFieldOptions.forEach((selection) => {
    const optionIds =
      selectedColorOptionIdsByFieldId.get(selection.field_id) ?? new Set<string>();
    optionIds.add(selection.color_option_id);
    selectedColorOptionIdsByFieldId.set(selection.field_id, optionIds);
  });

  return {
    products,
    categories,
    colorGroups,
    colorOptions,
    categoryById,
    categoryIdsByProductId,
    colorGroupById,
    colorOptionById,
    colorFieldsByProductId,
    selectedColorOptionIdsByFieldId,
    errors: {
      products: productsResult.error,
      categories: categoriesResult.error,
      productCategories: productCategoriesResult.error,
      colorGroups: colorGroupsResult.error,
      colorOptions: colorOptionsResult.error,
      productColorFields: productColorFieldsResult.error,
      productColorFieldOptions: productColorFieldOptionsResult.error,
    },
  };
}
