import type { SupabaseClient } from "@supabase/supabase-js";

import type { AdminData } from "@/lib/admin/data";
import {
  buildProductUpsellOfferMap,
  buildProductUpsellSettingsMap,
} from "@/lib/admin/product-upsell-admin";
import type { AdminProductLookups } from "@/lib/admin/product-lookups";
import { isProductLandingPagesMigrationMissing } from "@/lib/product-landing/admin-rpc";
import type { ProductLandingPageRow } from "@/lib/product-landing/types";
import type {
  HomeFeaturedProductRow,
  ProductCategoryRow,
  ProductColorFieldOptionRow,
  ProductColorFieldRow,
  ProductImageRow,
  ProductOptionGroupRow,
  ProductOptionValueRow,
  ProductPersonalizationFieldRow,
  ProductRow,
  ProductWishTemplateRow,
  RelatedProductRow,
} from "@/lib/admin/types";
import type {
  ProductFaqGroupRow,
  ProductFaqItemRow,
} from "@/lib/faq/types";
import type {
  ProductUpsellOfferRow,
  ProductUpsellSettingsRow,
} from "@/lib/storefront/product-upsells";

async function loadAdminOptionGroupsForProduct(
  supabase: SupabaseClient,
  productId: string,
) {
  const full = await supabase
    .from("product_option_groups")
    .select(
      "id,product_id,name,key,input_type,is_required,min_select,max_select,sort_order,is_active,pricing_mode,depends_on_option_id,placeholder,max_length,text_price_delta,image_display_size",
    )
    .eq("product_id", productId)
    .order("sort_order", { ascending: true });

  if (!full.error) {
    return full;
  }

  return supabase
    .from("product_option_groups")
    .select(
      "id,product_id,name,key,input_type,is_required,min_select,max_select,sort_order,is_active,pricing_mode,depends_on_option_id,placeholder,max_length,text_price_delta",
    )
    .eq("product_id", productId)
    .order("sort_order", { ascending: true });
}

/**
 * Loads one product + its children for admin edit, plus slim picker rows.
 * Avoids unbounded child-table scans from loadAdminData.
 */
export async function loadAdminProductEditBundle(
  supabase: SupabaseClient,
  productId: string,
  lookups: AdminProductLookups,
): Promise<{ data: AdminData | null; error: string | null }> {
  const productResult = await supabase
    .from("products")
    .select("*")
    .eq("id", productId)
    .maybeSingle();

  if (productResult.error) {
    return { data: null, error: productResult.error.message };
  }
  if (!productResult.data) {
    return { data: null, error: "Продуктът не беше намерен." };
  }

  const product = productResult.data as ProductRow;

  const [
    productCategoriesResult,
    colorFieldsResult,
    imagesResult,
    personalizationResult,
    wishLinksResult,
    featuredResult,
    relatedResult,
    upsellOffersResult,
    upsellSettingsResult,
    optionGroupsResult,
    landingPagesResult,
    faqGroupsLinkResult,
    faqItemsLinkResult,
    pickerResult,
  ] = await Promise.all([
    supabase
      .from("product_categories")
      .select("product_id,category_id")
      .eq("product_id", productId),
    supabase
      .from("product_color_fields")
      .select(
        "id,product_id,group_id,label,enabled,min_select,max_select,sort_order,selection_mode,required_total_quantity",
      )
      .eq("product_id", productId),
    supabase
      .from("product_images")
      .select("id,product_id,image_url,alt_text,sort_order,is_primary")
      .eq("product_id", productId)
      .order("sort_order", { ascending: true }),
    supabase
      .from("product_personalization_fields")
      .select(
        "id,product_id,label,field_key,field_type,placeholder,max_length,price_delta,is_required,allows_wish_templates,sort_order",
      )
      .eq("product_id", productId)
      .order("sort_order", { ascending: true }),
    supabase
      .from("product_wish_templates")
      .select("product_id,wish_template_id,sort_order")
      .eq("product_id", productId)
      .order("sort_order", { ascending: true }),
    supabase
      .from("home_featured_products")
      .select("product_id,sort_order")
      .eq("product_id", productId),
    supabase
      .from("related_products")
      .select("product_id,related_product_id,sort_order")
      .eq("product_id", productId)
      .order("sort_order", { ascending: true }),
    supabase
      .from("product_upsell_offers")
      .select(
        "id,source_product_id,upsell_product_id,offer_title,offer_description,special_price,suggested_quantity,max_quantity,sort_order,is_active,created_at,updated_at",
      )
      .eq("source_product_id", productId)
      .order("sort_order", { ascending: true }),
    supabase
      .from("product_upsell_settings")
      .select("source_product_id,section_title,created_at,updated_at")
      .eq("source_product_id", productId),
    loadAdminOptionGroupsForProduct(supabase, productId),
    supabase
      .from("product_landing_pages")
      .select(
        "id,product_id,title,slug,campaign_code,is_primary,is_active,sort_order,created_at,updated_at",
      )
      .eq("product_id", productId)
      .order("is_primary", { ascending: false })
      .order("sort_order", { ascending: true }),
    supabase
      .from("product_faq_groups")
      .select("product_id,group_id,sort_order,created_at")
      .eq("product_id", productId)
      .order("sort_order", { ascending: true }),
    supabase
      .from("product_faq_items")
      .select("product_id,faq_item_id,sort_order,created_at")
      .eq("product_id", productId)
      .order("sort_order", { ascending: true }),
    supabase
      .from("products")
      .select(
        "id,name,slug,product_code,price,image_url,is_sold_out,status,visibility",
      )
      .order("name", { ascending: true }),
  ]);

  const optionGroups = (optionGroupsResult.data ?? []) as ProductOptionGroupRow[];
  const groupIds = optionGroups.map((group) => group.id);
  const optionValuesResult =
    groupIds.length > 0
      ? await supabase
          .from("product_option_values")
          .select(
            "id,group_id,label,key,price_delta,is_default,is_active,is_sold_out,image_url,material_id,sku,sort_order",
          )
          .in("group_id", groupIds)
          .order("sort_order", { ascending: true })
      : { data: [], error: null };

  const colorFields = (colorFieldsResult.data ?? []) as ProductColorFieldRow[];
  const fieldIds = colorFields.map((field) => field.id);
  const colorFieldOptionsResult =
    fieldIds.length > 0
      ? await supabase
          .from("product_color_field_options")
          .select("field_id,color_option_id")
          .in("field_id", fieldIds)
      : { data: [], error: null };
  const colorFieldOptions = (colorFieldOptionsResult.data ??
    []) as ProductColorFieldOptionRow[];

  const categoryIdsByProductId = new Map<string, string[]>();
  for (const row of (productCategoriesResult.data ?? []) as ProductCategoryRow[]) {
    const ids = categoryIdsByProductId.get(row.product_id) ?? [];
    ids.push(row.category_id);
    categoryIdsByProductId.set(row.product_id, ids);
  }

  // Picker products need category links for related/upsell pickers.
  const pickerProducts = ((pickerResult.data ?? []) as ProductRow[]).filter(
    (row) => row.id !== productId,
  );
  if (pickerProducts.length > 0) {
    const pickerIds = pickerProducts.map((row) => row.id);
    const { data: pickerLinks } = await supabase
      .from("product_categories")
      .select("product_id,category_id")
      .in("product_id", pickerIds);
    for (const row of (pickerLinks ?? []) as ProductCategoryRow[]) {
      const ids = categoryIdsByProductId.get(row.product_id) ?? [];
      ids.push(row.category_id);
      categoryIdsByProductId.set(row.product_id, ids);
    }
  }

  const colorFieldsByProductId = new Map<string, ProductColorFieldRow[]>();
  colorFieldsByProductId.set(productId, colorFields);

  const selectedColorOptionIdsByFieldId = new Map<string, Set<string>>();
  for (const selection of colorFieldOptions) {
    const optionIds =
      selectedColorOptionIdsByFieldId.get(selection.field_id) ?? new Set<string>();
    optionIds.add(selection.color_option_id);
    selectedColorOptionIdsByFieldId.set(selection.field_id, optionIds);
  }

  const imagesByProductId = new Map<string, ProductImageRow[]>();
  imagesByProductId.set(
    productId,
    (imagesResult.data ?? []) as ProductImageRow[],
  );

  const personalizationFieldsByProductId = new Map<
    string,
    ProductPersonalizationFieldRow[]
  >();
  personalizationFieldsByProductId.set(
    productId,
    (personalizationResult.data ?? []) as ProductPersonalizationFieldRow[],
  );

  const wishTemplateIdsByProductId = new Map<string, string[]>();
  wishTemplateIdsByProductId.set(
    productId,
    ((wishLinksResult.data ?? []) as ProductWishTemplateRow[]).map(
      (link) => link.wish_template_id,
    ),
  );

  const faqGroupIdsByProductId = new Map<string, string[]>();
  faqGroupIdsByProductId.set(
    productId,
    ((faqGroupsLinkResult.data ?? []) as ProductFaqGroupRow[]).map(
      (link) => link.group_id,
    ),
  );

  const faqItemIdsByProductId = new Map<string, string[]>();
  faqItemIdsByProductId.set(
    productId,
    ((faqItemsLinkResult.data ?? []) as ProductFaqItemRow[]).map(
      (link) => link.faq_item_id,
    ),
  );

  const featuredProductById = new Map<string, HomeFeaturedProductRow>();
  for (const row of (featuredResult.data ?? []) as HomeFeaturedProductRow[]) {
    featuredProductById.set(row.product_id, row);
  }

  const relatedProductIdsByProductId = new Map<string, string[]>();
  relatedProductIdsByProductId.set(
    productId,
    ((relatedResult.data ?? []) as RelatedProductRow[]).map(
      (link) => link.related_product_id,
    ),
  );

  const optionGroupsByProductId = new Map<string, ProductOptionGroupRow[]>();
  optionGroupsByProductId.set(productId, optionGroups);

  const optionValuesByGroupId = new Map<string, ProductOptionValueRow[]>();
  for (const value of (optionValuesResult.data ?? []) as ProductOptionValueRow[]) {
    const values = optionValuesByGroupId.get(value.group_id) ?? [];
    values.push(value);
    optionValuesByGroupId.set(value.group_id, values);
  }

  const landingPagesMigrationMissing = isProductLandingPagesMigrationMissing(
    landingPagesResult.error,
  );
  const landingPages = landingPagesMigrationMissing
    ? []
    : ((landingPagesResult.data ?? []) as ProductLandingPageRow[]);
  const landingPagesByProductId = new Map<string, ProductLandingPageRow[]>();
  landingPagesByProductId.set(productId, landingPages);

  const upsellOffers = upsellOffersResult.error
    ? []
    : ((upsellOffersResult.data ?? []) as ProductUpsellOfferRow[]);
  const upsellSettings = upsellSettingsResult.error
    ? []
    : ((upsellSettingsResult.data ?? []) as ProductUpsellSettingsRow[]);

  const categories = lookups.categories;
  const categoryById = new Map(categories.map((category) => [category.id, category]));
  const colorGroupById = new Map(
    lookups.colorGroups.map((group) => [group.id, group]),
  );
  const colorOptionById = new Map(
    lookups.colorOptions.map((option) => [option.id, option]),
  );

  const firstError =
    productCategoriesResult.error?.message ||
    colorFieldsResult.error?.message ||
    imagesResult.error?.message ||
    personalizationResult.error?.message ||
    optionGroupsResult.error?.message ||
    optionValuesResult.error?.message ||
    pickerResult.error?.message ||
    null;

  if (firstError) {
    return { data: null, error: firstError };
  }

  const data: AdminData = {
    products: [product, ...pickerProducts],
    categories,
    colorGroups: lookups.colorGroups,
    colorOptions: lookups.colorOptions,
    categoryById,
    categoryIdsByProductId,
    colorGroupById,
    colorOptionById,
    colorFieldsByProductId,
    selectedColorOptionIdsByFieldId,
    imagesByProductId,
    personalizationFieldsByProductId,
    optionGroupsByProductId,
    optionValuesByGroupId,
    materials: lookups.materials,
    variantGroups: lookups.variantGroups,
    wishTemplates: lookups.wishTemplates,
    wishTemplateOccasions: lookups.wishTemplateOccasions,
    wishTemplateIdsByProductId,
    faqProductGroups: lookups.faqProductGroups,
    faqItems: lookups.faqItems,
    faqGroupIdsByProductId,
    faqItemIdsByProductId,
    featuredProductById,
    relatedProductIdsByProductId,
    upsellOffersByProductId: buildProductUpsellOfferMap(upsellOffers),
    upsellSettingsByProductId: buildProductUpsellSettingsMap(upsellSettings),
    relatedCategoryIdsByCategoryId: new Map(),
    landingPages,
    landingPagesByProductId,
    landingPagesMigrationMissing,
    errors: {
      products: null,
      categories: lookups.errors.categories,
      productCategories: null,
      colorGroups: lookups.errors.colorGroups,
      colorOptions: lookups.errors.colorOptions,
      productColorFields: null,
      productColorFieldOptions: colorFieldOptionsResult.error,
      productImages: null,
      personalizationFields: null,
      wishTemplates: lookups.errors.wishTemplates,
      wishTemplateOccasions: lookups.errors.wishTemplateOccasions,
      productWishTemplates: wishLinksResult.error,
      faqGroups: lookups.errors.faqGroups,
      faqItems: lookups.errors.faqItems,
      productFaqGroups: faqGroupsLinkResult.error,
      productFaqItems: faqItemsLinkResult.error,
      homeFeaturedProducts: featuredResult.error,
      relatedProducts: relatedResult.error,
      productUpsellOffers: upsellOffersResult.error,
      productUpsellSettings: upsellSettingsResult.error,
      categoryRelatedCategories: null,
      optionGroups: optionGroupsResult.error,
      optionValues: optionValuesResult.error,
      materials: lookups.errors.materials,
      variantGroups: lookups.errors.variantGroups,
      landingPages: landingPagesMigrationMissing ? null : landingPagesResult.error,
    },
  };

  return { data, error: null };
}
