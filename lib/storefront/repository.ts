import type { SupabaseClient } from "@supabase/supabase-js";
import { cache } from "react";

import type { Product } from "@/lib/catalog";
import { resolvePrimaryProductCategory } from "@/lib/seo/breadcrumbs";
import type { ProductColorField } from "@/lib/product-colors";
import type {
  ProductPersonalizationField,
  WishTemplate,
} from "@/lib/product-personalization";
import type { ProductPromotionRow } from "@/lib/product-pricing";
import { mapProductOptionGroups } from "@/lib/storefront/option-groups";
import {
  toProduct,
  type ProductImageRow,
  type ProductRow,
} from "@/lib/storefront/mappers";
import type {
  StorefrontCatalog,
  StorefrontCategory,
  StorefrontProduct,
} from "@/lib/storefront/types";
import {
  resolveProductRoute,
  type ProductRouteResolution,
} from "@/lib/product-route";
import { createClient } from "@/lib/supabase/server";

type ProductCategoryRow = {
  product_id: string;
  category_id: string;
};

type CategoryRow = {
  id: string;
  name: string;
  slug: string;
  category_type: "product" | "occasion";
  parent_id: string | null;
  image_url: string | null;
  image_alt: string | null;
  cover_image_url: string | null;
  cover_image_alt: string | null;
  show_on_home: boolean;
  home_sort_order: number;
  card_description: string | null;
  created_at: string | null;
};

function mapStorefrontCategory(row: CategoryRow): StorefrontCategory {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    category_type: row.category_type,
    parent_id: row.parent_id,
    image_url: row.image_url ?? null,
    image_alt: row.image_alt ?? null,
    cover_image_url: row.cover_image_url ?? null,
    cover_image_alt: row.cover_image_alt ?? null,
    show_on_home: row.show_on_home,
    home_sort_order: row.home_sort_order,
    card_description: row.card_description,
    createdAt: row.created_at ?? null,
  };
}

type HomeFeaturedProductRow = {
  product_id: string;
  sort_order: number;
};

type RelatedProductRow = {
  product_id: string;
  related_product_id: string;
  sort_order: number;
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
  selection_mode?: string | null;
  required_total_quantity?: number | null;
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

function pickActivePromotionByProductId(
  rows: ProductPromotionRow[],
): Map<string, ProductPromotionRow> {
  const now = Date.now();
  const byProductId = new Map<string, ProductPromotionRow>();

  rows.forEach((row) => {
    if (!row.is_active) {
      return;
    }

    const startsAt = new Date(row.starts_at).getTime();
    const endsAt = new Date(row.ends_at).getTime();
    if (startsAt > now || endsAt <= now) {
      return;
    }

    const existing = byProductId.get(row.product_id);
    if (!existing || new Date(row.created_at).getTime() > new Date(existing.created_at).getTime()) {
      byProductId.set(row.product_id, row);
    }
  });

  return byProductId;
}

async function loadActivePromotions(
  supabase: SupabaseClient,
): Promise<Map<string, ProductPromotionRow>> {
  const { data, error } = await supabase
    .from("product_promotions")
    .select(
      "id,product_id,name,discount_type,discount_value,starts_at,ends_at,is_active,created_at",
    )
    .eq("is_active", true);

  if (error) {
    return new Map();
  }

  return pickActivePromotionByProductId((data ?? []) as ProductPromotionRow[]);
}

async function fetchStorefrontCatalog(): Promise<StorefrontCatalog> {
  const supabase = await getClient();
  if (!supabase) {
    return {
      categories: [],
      products: [],
      featuredProductIds: [],
      relatedProductIdsByProductId: new Map(),
    };
  }

  const [
    productsResult,
    categoriesResult,
    relationsResult,
    imagesResult,
    promotionsByProductId,
    colorFieldsResult,
    personalizationFieldsResult,
    featuredProductsResult,
    relatedProductsResult,
  ] = await Promise.all([
      supabase
        .from("products")
        .select(
          "id,slug,product_code,name,subtitle,description,price,image_url,is_customizable,is_sold_out,fulfillment_type,stock_quantity,card_badge,primary_category_id,created_at,updated_at",
        )
        .order("created_at", { ascending: false }),
      supabase
        .from("categories")
        .select("id,name,slug,category_type,parent_id,image_url,image_alt,cover_image_url,cover_image_alt,show_on_home,home_sort_order,card_description,created_at")
        .order("name", { ascending: true }),
      supabase.from("product_categories").select("product_id,category_id"),
      supabase
        .from("product_images")
        .select("id,product_id,image_url,alt_text,sort_order,is_primary")
        .order("sort_order", { ascending: true }),
      loadActivePromotions(supabase),
      supabase
        .from("product_color_fields")
        .select("product_id")
        .eq("enabled", true),
      supabase.from("product_personalization_fields").select("product_id"),
      supabase
        .from("home_featured_products")
        .select("product_id,sort_order")
        .order("sort_order", { ascending: true }),
      supabase
        .from("related_products")
        .select("product_id,related_product_id,sort_order")
        .order("sort_order", { ascending: true }),
    ]);

  const categories = ((categoriesResult.data ?? []) as CategoryRow[]).map(
    mapStorefrontCategory,
  );
  const relations = (relationsResult.data ?? []) as ProductCategoryRow[];
  const categorySlugById = new Map(
    categories.map((category) => [category.id, category.slug]),
  );
  const categorySlugsByProductId = new Map<string, string[]>();
  const imagesByProductId = new Map<string, ProductImageRow[]>();
  const productIdsWithColorOptions = new Set<string>();
  const productIdsWithPersonalizationOptions = new Set<string>();
  const relatedProductIdsByProductId = new Map<string, string[]>();

  relations.forEach((relation) => {
    const categorySlug = categorySlugById.get(relation.category_id);
    if (!categorySlug) {
      return;
    }

    const slugs = categorySlugsByProductId.get(relation.product_id) ?? [];
    slugs.push(categorySlug);
    categorySlugsByProductId.set(relation.product_id, slugs);
  });

  ((imagesResult.data ?? []) as ProductImageRow[]).forEach((image) => {
    const images = imagesByProductId.get(image.product_id) ?? [];
    images.push(image);
    imagesByProductId.set(image.product_id, images);
  });

  (colorFieldsResult.data ?? []).forEach((row) => {
    if (typeof row.product_id === "string") {
      productIdsWithColorOptions.add(row.product_id);
    }
  });

  (personalizationFieldsResult.data ?? []).forEach((row) => {
    if (typeof row.product_id === "string") {
      productIdsWithPersonalizationOptions.add(row.product_id);
    }
  });

  const products: StorefrontProduct[] = ((productsResult.data ?? []) as ProductRow[]).map(
    (row) => ({
      ...toProduct(
        row,
        imagesByProductId.get(row.id) ?? [],
        promotionsByProductId.get(row.id) ?? null,
      ),
      categorySlugs: categorySlugsByProductId.get(row.id) ?? [],
      primaryCategoryId: row.primary_category_id ?? null,
      updatedAt: row.updated_at ?? null,
      createdAt: row.created_at ?? null,
      hasColorOptions: productIdsWithColorOptions.has(row.id),
      hasPersonalizationOptions: productIdsWithPersonalizationOptions.has(row.id),
    }),
  );

  ((relatedProductsResult.data ?? []) as RelatedProductRow[]).forEach((link) => {
    const ids = relatedProductIdsByProductId.get(link.product_id) ?? [];
    ids.push(link.related_product_id);
    relatedProductIdsByProductId.set(link.product_id, ids);
  });

  const featuredProductIds = featuredProductsResult.error
    ? products.slice(0, 6).map((product) => product.id)
    : ((featuredProductsResult.data ?? []) as HomeFeaturedProductRow[]).map(
        (row) => row.product_id,
      );

  return {
    categories,
    products,
    featuredProductIds,
    relatedProductIdsByProductId,
  };
}

export const getStorefrontCatalog = cache(fetchStorefrontCatalog);

export type StorefrontProductSeoContext = {
  categories: StorefrontCategory[];
  categorySlugs: string[];
  primaryCategory: StorefrontCategory | null;
};

async function fetchStorefrontProductSeoContext(
  productId: string,
): Promise<StorefrontProductSeoContext> {
  const supabase = await getClient();
  if (!supabase) {
    return { categories: [], categorySlugs: [], primaryCategory: null };
  }

  const { data: relations } = await supabase
    .from("product_categories")
    .select("category_id")
    .eq("product_id", productId);
  const { data: productRow } = await supabase
    .from("products")
    .select("primary_category_id")
    .eq("id", productId)
    .maybeSingle();

  const categoryIds = (relations ?? []).map((row) => String(row.category_id));
  if (categoryIds.length === 0) {
    return { categories: [], categorySlugs: [], primaryCategory: null };
  }

  const { data: directCategories } = await supabase
    .from("categories")
    .select(
      "id,name,slug,category_type,parent_id,image_url,image_alt,cover_image_url,cover_image_alt,show_on_home,home_sort_order,card_description,created_at",
    )
    .in("id", categoryIds);

  const direct = ((directCategories ?? []) as CategoryRow[]).map(
    mapStorefrontCategory,
  );
  const parentIds = [
    ...new Set(
      direct
        .map((category) => category.parent_id)
        .filter((parentId): parentId is string => Boolean(parentId)),
    ),
  ];

  let parents: StorefrontCategory[] = [];
  if (parentIds.length > 0) {
    const { data: parentCategories } = await supabase
      .from("categories")
      .select(
        "id,name,slug,category_type,parent_id,image_url,image_alt,cover_image_url,cover_image_alt,show_on_home,home_sort_order,card_description,created_at",
      )
      .in("id", parentIds);
    parents = ((parentCategories ?? []) as CategoryRow[]).map(
      mapStorefrontCategory,
    );
  }

  const categories = [...direct, ...parents].filter(
    (category, index, list) =>
      list.findIndex((entry) => entry.id === category.id) === index,
  );
  const categorySlugs = direct
    .filter((category) => category.category_type === "product")
    .map((category) => category.slug);

  return {
    categories,
    categorySlugs,
    primaryCategory: resolvePrimaryProductCategory(
      categories,
      categorySlugs,
      typeof productRow?.primary_category_id === "string"
        ? productRow.primary_category_id
        : null,
    ),
  };
}

export const getStorefrontProductSeoContext = cache(
  fetchStorefrontProductSeoContext,
);

export async function getStorefrontCategories(
  categoryType?: StorefrontCategory["category_type"],
): Promise<StorefrontCategory[]> {
  const supabase = await getClient();
  if (!supabase) {
    return [];
  }

  let query = supabase
    .from("categories")
    .select("id,name,slug,category_type,parent_id,image_url,image_alt,cover_image_url,cover_image_alt,show_on_home,home_sort_order,card_description,created_at")
    .order("name", { ascending: true });

  if (categoryType) {
    query = query.eq("category_type", categoryType);
  }

  const { data, error } = await query;
  return error
    ? []
    : ((data ?? []) as CategoryRow[]).map(mapStorefrontCategory);
}

async function getProductColorFields(
  supabase: SupabaseClient,
  productId: string,
): Promise<ProductColorField[]> {
  const [groupsResult, fieldsResult] = await Promise.all([
    supabase.from("color_groups").select("id,key,label"),
    supabase
      .from("product_color_fields")
      .select("id,group_id,label,min_select,max_select,sort_order,selection_mode,required_total_quantity")
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
        selectionMode:
          field.selection_mode === "quantity" ? "quantity" : "choice",
        ...(field.selection_mode === "quantity" &&
        field.required_total_quantity !== null &&
        field.required_total_quantity !== undefined
          ? {
              requiredTotalQuantity: Math.max(
                1,
                Number(field.required_total_quantity) || 1,
              ),
            }
          : {}),
        options,
      };
    })
    .filter((field): field is ProductColorField => field !== null);
}

async function loadStorefrontProductDetails(
  supabase: SupabaseClient,
  productId: string,
): Promise<Product | null> {
  const { data, error } = await supabase
    .from("products")
    .select(
      "id,slug,product_code,name,subtitle,description,additional_info,fulfillment_note,price,image_url,is_customizable,is_sold_out,fulfillment_type,stock_quantity,card_badge",
    )
    .eq("id", productId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  const [
    imagesResult,
    colorFields,
    personalizationResult,
    wishesResult,
    linksResult,
    promotionsByProductId,
    optionGroupsResult,
    optionValuesResult,
  ] = await Promise.all([
      supabase
        .from("product_images")
        .select("id,product_id,image_url,alt_text,sort_order,is_primary")
        .eq("product_id", productId)
        .order("sort_order", { ascending: true }),
      getProductColorFields(supabase, productId),
      supabase
        .from("product_personalization_fields")
        .select("id,label,field_key,field_type,placeholder,max_length,price_delta,is_required,allows_wish_templates,sort_order")
        .eq("product_id", productId)
        .order("sort_order"),
      supabase
        .from("wish_templates")
        .select("id,body,sort_order")
        .eq("is_active", true)
        .order("sort_order"),
      supabase
        .from("product_wish_templates")
        .select("wish_template_id,sort_order")
        .eq("product_id", productId)
        .order("sort_order"),
      loadActivePromotions(supabase),
      supabase
        .from("product_option_groups")
        .select(
          "id,name,key,input_type,is_required,min_select,max_select,sort_order,is_active,pricing_mode,depends_on_option_id,placeholder,max_length,text_price_delta",
        )
        .eq("product_id", productId)
        .eq("is_active", true)
        .order("sort_order"),
      supabase
        .from("product_option_values")
        .select(
          "id,group_id,label,key,price_delta,is_default,is_active,is_sold_out,sku,sort_order",
        )
        .eq("is_active", true)
        .order("sort_order"),
    ]);
  const product = toProduct(
    data as ProductRow,
    (imagesResult.data ?? []) as ProductImageRow[],
    promotionsByProductId.get(productId) ?? null,
  );

  product.colorFields = colorFields;
  const groupIds = (optionGroupsResult.data ?? []).map((group) => String(group.id));
  const filteredValues = (optionValuesResult.data ?? []).filter((value) =>
    groupIds.includes(String(value.group_id)),
  );
  product.optionGroups = mapProductOptionGroups(
    optionGroupsResult.data ?? [],
    filteredValues,
  );
  product.hasUniversalOptions = (product.optionGroups?.length ?? 0) > 0;
  product.personalizationFields = (personalizationResult.data ?? []).map(
    (field): ProductPersonalizationField => ({
      id: String(field.id),
      label: String(field.label),
      key: String(field.field_key),
      type: field.field_type as ProductPersonalizationField["type"],
      placeholder: field.placeholder ? String(field.placeholder) : null,
      maxLength: Number(field.max_length) || 100,
      priceDelta: Math.max(0, Number(field.price_delta) || 0),
      required: Boolean(field.is_required),
      allowsWishTemplates: Boolean(field.allows_wish_templates),
    }),
  );

  const wishById = new Map(
    (wishesResult.data ?? []).map((wish) => [String(wish.id), wish]),
  );
  product.wishTemplates = (linksResult.data ?? []).flatMap(
    (link): WishTemplate[] => {
      const wish = wishById.get(String(link.wish_template_id));
      return wish
        ? [{ id: String(wish.id), body: String(wish.body) }]
        : [];
    },
  );
  return product;
}

/** Load a product by internal UUID (campaign checkout, admin, orders). */
export async function getStorefrontProduct(productId: string): Promise<Product | null> {
  const supabase = await getClient();
  if (!supabase) {
    return null;
  }
  return loadStorefrontProductDetails(supabase, productId);
}

async function fetchStorefrontProductPage(
  routeParam: string,
): Promise<ProductRouteResolution> {
  const supabase = await getClient();
  if (!supabase) {
    return { kind: "not_found" };
  }

  const route = await resolveProductRoute(supabase, routeParam);
  if (route.kind !== "page") {
    return route;
  }

  const product = await loadStorefrontProductDetails(supabase, route.product.id);
  if (!product) {
    return { kind: "not_found" };
  }

  return {
    kind: "page",
    product,
    canonicalSlug: product.slug,
  };
}

export const getStorefrontProductPage = cache(fetchStorefrontProductPage);
