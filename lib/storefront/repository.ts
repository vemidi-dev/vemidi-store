import type { SupabaseClient } from "@supabase/supabase-js";

import type { Product } from "@/lib/catalog";
import type { ProductColorField } from "@/lib/product-colors";
import type {
  ProductPersonalizationField,
  WishTemplate,
} from "@/lib/product-personalization";
import { toProduct, type ProductRow } from "@/lib/storefront/mappers";
import type {
  StorefrontCatalog,
  StorefrontCategory,
  StorefrontProduct,
} from "@/lib/storefront/types";
import { createClient } from "@/lib/supabase/server";

type ProductCategoryRow = {
  product_id: string;
  category_id: string;
};

type ColorGroupRow = {
  id: string;
  key: string;
  label: string;
};

type ColorFieldRow = {
  id: string;
  group_id: string;
  label: string;
  min_select: number;
  max_select: number;
  sort_order: number | null;
};

type ColorFieldOptionRow = {
  field_id: string;
  color_option_id: string;
};

type ColorOptionRow = {
  id: string;
  group_id: string;
  name: string;
  hex: string | null;
};

async function getClient(): Promise<SupabaseClient | null> {
  return createClient();
}

export async function getStorefrontCatalog(): Promise<StorefrontCatalog> {
  const supabase = await getClient();
  if (!supabase) {
    return { categories: [], products: [] };
  }

  const [productsResult, categoriesResult, relationsResult] = await Promise.all([
    supabase
      .from("products")
      .select("id,name,description,price,image_url,is_customizable,created_at")
      .order("created_at", { ascending: false }),
    supabase
      .from("categories")
      .select("id,name,slug,category_type")
      .order("name", { ascending: true }),
    supabase.from("product_categories").select("product_id,category_id"),
  ]);

  const categories = (categoriesResult.data ?? []) as StorefrontCategory[];
  const relations = (relationsResult.data ?? []) as ProductCategoryRow[];
  const categorySlugById = new Map(
    categories.map((category) => [category.id, category.slug]),
  );
  const categorySlugsByProductId = new Map<string, string[]>();

  relations.forEach((relation) => {
    const categorySlug = categorySlugById.get(relation.category_id);
    if (!categorySlug) {
      return;
    }

    const slugs = categorySlugsByProductId.get(relation.product_id) ?? [];
    slugs.push(categorySlug);
    categorySlugsByProductId.set(relation.product_id, slugs);
  });

  const products: StorefrontProduct[] = ((productsResult.data ?? []) as ProductRow[]).map(
    (row) => ({
      ...toProduct(row),
      categorySlugs: categorySlugsByProductId.get(row.id) ?? [],
    }),
  );

  return { categories, products };
}

export async function getStorefrontCategories(
  categoryType?: StorefrontCategory["category_type"],
): Promise<StorefrontCategory[]> {
  const supabase = await getClient();
  if (!supabase) {
    return [];
  }

  let query = supabase
    .from("categories")
    .select("id,name,slug,category_type")
    .order("name", { ascending: true });

  if (categoryType) {
    query = query.eq("category_type", categoryType);
  }

  const { data, error } = await query;
  return error ? [] : ((data ?? []) as StorefrontCategory[]);
}

async function getProductColorFields(
  supabase: SupabaseClient,
  productId: string,
): Promise<ProductColorField[]> {
  const [groupsResult, fieldsResult] = await Promise.all([
    supabase.from("color_groups").select("id,key,label"),
    supabase
      .from("product_color_fields")
      .select("id,group_id,label,min_select,max_select,sort_order")
      .eq("product_id", productId)
      .eq("enabled", true),
  ]);

  const groups = (groupsResult.data ?? []) as ColorGroupRow[];
  const fields = (fieldsResult.data ?? []) as ColorFieldRow[];
  const groupIds = Array.from(new Set(fields.map((field) => field.group_id)));
  const fieldIds = fields.map((field) => field.id);

  if (groupIds.length === 0 || fieldIds.length === 0) {
    return [];
  }

  const [fieldOptionsResult, optionsResult] = await Promise.all([
    supabase
      .from("product_color_field_options")
      .select("field_id,color_option_id")
      .in("field_id", fieldIds),
    supabase
      .from("color_options")
      .select("id,group_id,name,hex,sort_order")
      .in("group_id", groupIds)
      .eq("is_active", true)
      .order("sort_order", { ascending: true }),
  ]);

  const groupsById = new Map(groups.map((group) => [group.id, group]));
  const selectedOptionIdsByField = new Map<string, Set<string>>();

  ((fieldOptionsResult.data ?? []) as ColorFieldOptionRow[]).forEach((row) => {
    const optionIds = selectedOptionIdsByField.get(row.field_id) ?? new Set<string>();
    optionIds.add(row.color_option_id);
    selectedOptionIdsByField.set(row.field_id, optionIds);
  });

  const optionsByGroup = new Map<string, ColorOptionRow[]>();
  ((optionsResult.data ?? []) as ColorOptionRow[]).forEach((option) => {
    const options = optionsByGroup.get(option.group_id) ?? [];
    options.push(option);
    optionsByGroup.set(option.group_id, options);
  });

  return fields
    .sort((a, b) => {
      const sortDifference = (a.sort_order ?? 0) - (b.sort_order ?? 0);
      return sortDifference || a.label.localeCompare(b.label, "bg");
    })
    .map((field): ProductColorField | null => {
      const group = groupsById.get(field.group_id);
      if (!group) {
        return null;
      }

      const allowedOptionIds = selectedOptionIdsByField.get(field.id);
      const options = (optionsByGroup.get(field.group_id) ?? [])
        .filter((option) => !allowedOptionIds?.size || allowedOptionIds.has(option.id))
        .map(({ id, name, hex }) => ({ id, name, hex }));

      if (options.length === 0) {
        return null;
      }

      return {
        id: field.id,
        label: field.label,
        key: group.key,
        groupId: group.id,
        groupLabel: group.label,
        minSelect: Math.max(0, Number(field.min_select) || 0),
        maxSelect: Math.max(1, Number(field.max_select) || 1),
        options,
      };
    })
    .filter((field): field is ProductColorField => field !== null);
}

export async function getStorefrontProduct(productId: string): Promise<Product | null> {
  const supabase = await getClient();
  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase
    .from("products")
    .select(
      "id,name,description,additional_info,fulfillment_note,price,image_url,is_customizable",
    )
    .eq("id", productId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  const product = toProduct(data as ProductRow);
  const [colorFields, personalizationResult, categoryResult, wishesResult, linksResult] =
    await Promise.all([
      getProductColorFields(supabase, productId),
      supabase
        .from("product_personalization_fields")
        .select("id,label,field_key,field_type,placeholder,max_length,is_required,allows_wish_templates,sort_order")
        .eq("product_id", productId)
        .order("sort_order"),
      supabase.from("product_categories").select("category_id").eq("product_id", productId),
      supabase
        .from("wish_templates")
        .select("id,title,body,sort_order")
        .eq("is_active", true)
        .order("sort_order"),
      supabase.from("wish_template_occasions").select("wish_template_id,category_id"),
    ]);

  product.colorFields = colorFields;
  product.personalizationFields = (personalizationResult.data ?? []).map(
    (field): ProductPersonalizationField => ({
      id: String(field.id),
      label: String(field.label),
      key: String(field.field_key),
      type: field.field_type as ProductPersonalizationField["type"],
      placeholder: field.placeholder ? String(field.placeholder) : null,
      maxLength: Number(field.max_length) || 100,
      required: Boolean(field.is_required),
      allowsWishTemplates: Boolean(field.allows_wish_templates),
    }),
  );

  const productCategoryIds = new Set(
    (categoryResult.data ?? []).map((row) => String(row.category_id)),
  );
  const categorySlugById = new Map(
    (
      await supabase
        .from("categories")
        .select("id,slug")
        .eq("category_type", "occasion")
    ).data?.map((row) => [String(row.id), String(row.slug)]) ?? [],
  );
  const occasionsByWish = new Map<string, string[]>();
  (linksResult.data ?? []).forEach((link) => {
    if (!productCategoryIds.has(String(link.category_id))) return;
    const slug = categorySlugById.get(String(link.category_id));
    if (!slug) return;
    const slugs = occasionsByWish.get(String(link.wish_template_id)) ?? [];
    slugs.push(slug);
    occasionsByWish.set(String(link.wish_template_id), slugs);
  });
  product.wishTemplates = (wishesResult.data ?? [])
    .filter((wish) => occasionsByWish.has(String(wish.id)))
    .map(
      (wish): WishTemplate => ({
        id: String(wish.id),
        title: String(wish.title),
        body: String(wish.body),
        occasionSlugs: occasionsByWish.get(String(wish.id)) ?? [],
      }),
    );
  return product;
}
