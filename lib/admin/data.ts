import type { SupabaseClient } from "@supabase/supabase-js";

import type {
  CategoryRow,
  ColorGroupRow,
  ColorOptionRow,
  HomeFeaturedProductRow,
  ProductCategoryRow,
  ProductColorFieldOptionRow,
  ProductColorFieldRow,
  ProductRow,
  ProductImageRow,
  ProductOptionGroupRow,
  ProductOptionValueRow,
  ProductPersonalizationFieldRow,
  RelatedProductRow,
  CategoryRelatedCategoryRow,
  ProductWishTemplateRow,
  WishTemplateOccasionRow,
  WishTemplateRow,
} from "@/lib/admin/types";
import {
  buildProductUpsellOfferMap,
  buildProductUpsellSettingsMap,
} from "@/lib/admin/product-upsell-admin";
import type {
  ProductUpsellOfferRow,
  ProductUpsellSettingsRow,
} from "@/lib/storefront/product-upsells";
import { isProductLandingPagesMigrationMissing } from "@/lib/product-landing/admin-rpc";
import type { ProductLandingPageRow } from "@/lib/product-landing/types";
import type {
  FaqGroupRow,
  FaqItemRow,
  ProductFaqGroupRow,
  ProductFaqItemRow,
} from "@/lib/faq/types";

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
  imagesByProductId: Map<string, ProductImageRow[]>;
  personalizationFieldsByProductId: Map<string, ProductPersonalizationFieldRow[]>;
  optionGroupsByProductId: Map<string, ProductOptionGroupRow[]>;
  optionValuesByGroupId: Map<string, ProductOptionValueRow[]>;
  wishTemplates: WishTemplateRow[];
  wishTemplateOccasions: WishTemplateOccasionRow[];
  wishTemplateIdsByProductId: Map<string, string[]>;
  faqProductGroups: FaqGroupRow[];
  faqItems: FaqItemRow[];
  faqGroupIdsByProductId: Map<string, string[]>;
  faqItemIdsByProductId: Map<string, string[]>;
  featuredProductById: Map<string, HomeFeaturedProductRow>;
  relatedProductIdsByProductId: Map<string, string[]>;
  upsellOffersByProductId: Map<string, ProductUpsellOfferRow[]>;
  upsellSettingsByProductId: Map<string, ProductUpsellSettingsRow>;
  relatedCategoryIdsByCategoryId: Map<string, string[]>;
  landingPages: ProductLandingPageRow[];
  landingPagesByProductId: Map<string, ProductLandingPageRow[]>;
  landingPagesMigrationMissing: boolean;
  errors: {
    products: QueryError;
    categories: QueryError;
    productCategories: QueryError;
    colorGroups: QueryError;
    colorOptions: QueryError;
    productColorFields: QueryError;
    productColorFieldOptions: QueryError;
    productImages: QueryError;
    personalizationFields: QueryError;
    wishTemplates: QueryError;
    wishTemplateOccasions: QueryError;
    productWishTemplates: QueryError;
    faqGroups: QueryError;
    faqItems: QueryError;
    productFaqGroups: QueryError;
    productFaqItems: QueryError;
    homeFeaturedProducts: QueryError;
    relatedProducts: QueryError;
    productUpsellOffers: QueryError;
    productUpsellSettings: QueryError;
    categoryRelatedCategories: QueryError;
    optionGroups: QueryError;
    optionValues: QueryError;
    landingPages: QueryError;
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
    productImagesResult,
    personalizationFieldsResult,
    wishTemplatesResult,
    wishTemplateOccasionsResult,
    productWishTemplatesResult,
    homeFeaturedProductsResult,
    relatedProductsResult,
    productUpsellOffersResult,
    productUpsellSettingsResult,
    categoryRelatedCategoriesResult,
    optionGroupsResult,
    optionValuesResult,
    landingPagesResult,
    faqGroupsResult,
    faqItemsResult,
    productFaqGroupsResult,
    productFaqItemsResult,
  ] = await Promise.all([
    supabase.from("products").select("*").order("id", { ascending: false }),
    supabase
      .from("categories")
      .select("id,name,slug,category_type,parent_id,image_url,image_alt,cover_image_url,cover_image_alt,show_on_home,home_sort_order,card_description,is_visible,hero_description,listing_heading,intro_text,seo_body,meta_title,meta_description,og_title,og_description,robots_index")
      .order("category_type", { ascending: true })
      .order("home_sort_order", { ascending: true })
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
      .select("id,product_id,group_id,label,enabled,min_select,max_select,sort_order,selection_mode,required_total_quantity"),
    supabase.from("product_color_field_options").select("field_id,color_option_id"),
    supabase
      .from("product_images")
      .select("id,product_id,image_url,alt_text,sort_order,is_primary")
      .order("sort_order", { ascending: true }),
    supabase
      .from("product_personalization_fields")
      .select(
        "id,product_id,label,field_key,field_type,placeholder,max_length,price_delta,is_required,allows_wish_templates,sort_order",
      )
      .order("sort_order", { ascending: true }),
    supabase
      .from("wish_templates")
      .select("id,title,body,is_active,sort_order")
      .eq("is_active", true)
      .order("sort_order", { ascending: true }),
    supabase
      .from("wish_template_occasions")
      .select("wish_template_id,category_id"),
    supabase
      .from("product_wish_templates")
      .select("product_id,wish_template_id,sort_order")
      .order("sort_order", { ascending: true }),
    supabase
      .from("home_featured_products")
      .select("product_id,sort_order")
      .order("sort_order", { ascending: true }),
    supabase
      .from("related_products")
      .select("product_id,related_product_id,sort_order")
      .order("sort_order", { ascending: true }),
    supabase
      .from("product_upsell_offers")
      .select(
        "id,source_product_id,upsell_product_id,offer_title,offer_description,special_price,suggested_quantity,max_quantity,sort_order,is_active,created_at,updated_at",
      )
      .order("source_product_id", { ascending: true })
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true }),
    supabase
      .from("product_upsell_settings")
      .select("source_product_id,section_title,created_at,updated_at")
      .order("source_product_id", { ascending: true }),
    supabase
      .from("category_related_categories")
      .select("category_id,related_category_id,sort_order")
      .order("sort_order", { ascending: true }),
    supabase
      .from("product_option_groups")
      .select(
        "id,product_id,name,key,input_type,is_required,min_select,max_select,sort_order,is_active,pricing_mode,depends_on_option_id,placeholder,max_length,text_price_delta",
      )
      .order("sort_order", { ascending: true }),
    supabase
      .from("product_option_values")
      .select(
        "id,group_id,label,key,price_delta,is_default,is_active,is_sold_out,sku,sort_order",
      )
      .order("sort_order", { ascending: true }),
    supabase
      .from("product_landing_pages")
      .select(
        "id,product_id,title,slug,campaign_code,is_primary,is_active,sort_order,created_at,updated_at",
      )
      .order("product_id", { ascending: true })
      .order("is_primary", { ascending: false })
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true }),
    supabase
      .from("faq_groups")
      .select("id,name,slug,scope,is_active,sort_order,created_at,updated_at")
      .eq("scope", "product")
      .order("sort_order", { ascending: true }),
    supabase
      .from("faq_items")
      .select("id,question,answer,is_active,sort_order,created_at,updated_at")
      .order("sort_order", { ascending: true }),
    supabase
      .from("product_faq_groups")
      .select("product_id,group_id,sort_order,created_at")
      .order("sort_order", { ascending: true }),
    supabase
      .from("product_faq_items")
      .select("product_id,faq_item_id,sort_order,created_at")
      .order("sort_order", { ascending: true }),
  ]);

  const products = (productsResult.data ?? []) as ProductRow[];
  const categories = (categoriesResult.data ?? []) as CategoryRow[];
  const productCategories = (productCategoriesResult.data ?? []) as ProductCategoryRow[];
  const colorGroups = (colorGroupsResult.data ?? []) as ColorGroupRow[];
  const colorOptions = (colorOptionsResult.data ?? []) as ColorOptionRow[];
  const productColorFields = (productColorFieldsResult.data ?? []) as ProductColorFieldRow[];
  const productColorFieldOptions = (productColorFieldOptionsResult.data ??
    []) as ProductColorFieldOptionRow[];
  const productImages = (productImagesResult.data ?? []) as ProductImageRow[];
  const personalizationFields = (personalizationFieldsResult.data ??
    []) as ProductPersonalizationFieldRow[];
  const wishTemplates = (wishTemplatesResult.data ?? []) as WishTemplateRow[];
  const wishTemplateOccasions = (wishTemplateOccasionsResult.data ??
    []) as WishTemplateOccasionRow[];
  const productWishTemplates = (productWishTemplatesResult.data ??
    []) as ProductWishTemplateRow[];
  const homeFeaturedProducts = (homeFeaturedProductsResult.data ??
    []) as HomeFeaturedProductRow[];
  const relatedProducts = (relatedProductsResult.data ?? []) as RelatedProductRow[];
  const productUpsellOffers = productUpsellOffersResult.error
    ? []
    : ((productUpsellOffersResult.data ?? []) as ProductUpsellOfferRow[]);
  const productUpsellSettings = productUpsellSettingsResult.error
    ? []
    : ((productUpsellSettingsResult.data ?? []) as ProductUpsellSettingsRow[]);
  const categoryRelatedCategories = (categoryRelatedCategoriesResult.data ??
    []) as CategoryRelatedCategoryRow[];
  const optionGroups = (optionGroupsResult.data ?? []) as ProductOptionGroupRow[];
  const optionValues = (optionValuesResult.data ?? []) as ProductOptionValueRow[];
  const landingPagesMigrationMissing = isProductLandingPagesMigrationMissing(
    landingPagesResult.error,
  );
  const landingPages = landingPagesMigrationMissing
    ? []
    : ((landingPagesResult.data ?? []) as ProductLandingPageRow[]);
  const faqProductGroups = (faqGroupsResult.data ?? []) as FaqGroupRow[];
  const faqItems = (faqItemsResult.data ?? []) as FaqItemRow[];
  const productFaqGroups = (productFaqGroupsResult.data ?? []) as ProductFaqGroupRow[];
  const productFaqItems = (productFaqItemsResult.data ?? []) as ProductFaqItemRow[];

  const categoryById = new Map(categories.map((category) => [category.id, category]));
  const categoryIdsByProductId = new Map<string, string[]>();
  const colorGroupById = new Map(colorGroups.map((group) => [group.id, group]));
  const colorOptionById = new Map(colorOptions.map((option) => [option.id, option]));
  const colorFieldsByProductId = new Map<string, ProductColorFieldRow[]>();
  const selectedColorOptionIdsByFieldId = new Map<string, Set<string>>();
  const imagesByProductId = new Map<string, ProductImageRow[]>();
  const personalizationFieldsByProductId = new Map<
    string,
    ProductPersonalizationFieldRow[]
  >();
  const wishTemplateIdsByProductId = new Map<string, string[]>();
  const faqGroupIdsByProductId = new Map<string, string[]>();
  const faqItemIdsByProductId = new Map<string, string[]>();
  const featuredProductById = new Map(
    homeFeaturedProducts.map((row) => [row.product_id, row]),
  );
  const relatedProductIdsByProductId = new Map<string, string[]>();
  const upsellOffersByProductId = buildProductUpsellOfferMap(productUpsellOffers);
  const upsellSettingsByProductId =
    buildProductUpsellSettingsMap(productUpsellSettings);
  const relatedCategoryIdsByCategoryId = new Map<string, string[]>();
  const optionGroupsByProductId = new Map<string, ProductOptionGroupRow[]>();
  const optionValuesByGroupId = new Map<string, ProductOptionValueRow[]>();
  const landingPagesByProductId = new Map<string, ProductLandingPageRow[]>();

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
        return sortDifference || (a.label ?? "").localeCompare(b.label ?? "", "bg");
      }),
    );
  });

  productColorFieldOptions.forEach((selection) => {
    const optionIds =
      selectedColorOptionIdsByFieldId.get(selection.field_id) ?? new Set<string>();
    optionIds.add(selection.color_option_id);
    selectedColorOptionIdsByFieldId.set(selection.field_id, optionIds);
  });

  productImages.forEach((image) => {
    const images = imagesByProductId.get(image.product_id) ?? [];
    images.push(image);
    imagesByProductId.set(image.product_id, images);
  });

  personalizationFields.forEach((field) => {
    const fields = personalizationFieldsByProductId.get(field.product_id) ?? [];
    fields.push(field);
    personalizationFieldsByProductId.set(field.product_id, fields);
  });

  productWishTemplates.forEach((link) => {
    const ids = wishTemplateIdsByProductId.get(link.product_id) ?? [];
    ids.push(link.wish_template_id);
    wishTemplateIdsByProductId.set(link.product_id, ids);
  });

  productFaqGroups.forEach((link) => {
    const ids = faqGroupIdsByProductId.get(link.product_id) ?? [];
    ids.push(link.group_id);
    faqGroupIdsByProductId.set(link.product_id, ids);
  });

  productFaqItems.forEach((link) => {
    const ids = faqItemIdsByProductId.get(link.product_id) ?? [];
    ids.push(link.faq_item_id);
    faqItemIdsByProductId.set(link.product_id, ids);
  });

  relatedProducts.forEach((link) => {
    const ids = relatedProductIdsByProductId.get(link.product_id) ?? [];
    ids.push(link.related_product_id);
    relatedProductIdsByProductId.set(link.product_id, ids);
  });

  categoryRelatedCategories.forEach((link) => {
    const ids = relatedCategoryIdsByCategoryId.get(link.category_id) ?? [];
    ids.push(link.related_category_id);
    relatedCategoryIdsByCategoryId.set(link.category_id, ids);
  });

  optionGroups.forEach((group) => {
    const groups = optionGroupsByProductId.get(group.product_id) ?? [];
    groups.push(group);
    optionGroupsByProductId.set(group.product_id, groups);
  });

  optionValues.forEach((value) => {
    const values = optionValuesByGroupId.get(value.group_id) ?? [];
    values.push(value);
    optionValuesByGroupId.set(value.group_id, values);
  });

  landingPages.forEach((landingPage) => {
    const pages = landingPagesByProductId.get(landingPage.product_id) ?? [];
    pages.push(landingPage);
    landingPagesByProductId.set(landingPage.product_id, pages);
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
    imagesByProductId,
    personalizationFieldsByProductId,
    optionGroupsByProductId,
    optionValuesByGroupId,
    wishTemplates,
    wishTemplateOccasions,
    wishTemplateIdsByProductId,
    faqProductGroups,
    faqItems,
    faqGroupIdsByProductId,
    faqItemIdsByProductId,
    featuredProductById,
    relatedProductIdsByProductId,
    upsellOffersByProductId,
    upsellSettingsByProductId,
    relatedCategoryIdsByCategoryId,
    landingPages,
    landingPagesByProductId,
    landingPagesMigrationMissing,
    errors: {
      products: productsResult.error,
      categories: categoriesResult.error,
      productCategories: productCategoriesResult.error,
      colorGroups: colorGroupsResult.error,
      colorOptions: colorOptionsResult.error,
      productColorFields: productColorFieldsResult.error,
      productColorFieldOptions: productColorFieldOptionsResult.error,
      productImages: productImagesResult.error,
      personalizationFields: personalizationFieldsResult.error,
      wishTemplates: wishTemplatesResult.error,
      wishTemplateOccasions: wishTemplateOccasionsResult.error,
      productWishTemplates: productWishTemplatesResult.error,
      faqGroups: faqGroupsResult.error,
      faqItems: faqItemsResult.error,
      productFaqGroups: productFaqGroupsResult.error,
      productFaqItems: productFaqItemsResult.error,
      homeFeaturedProducts: homeFeaturedProductsResult.error,
      relatedProducts: relatedProductsResult.error,
      productUpsellOffers: productUpsellOffersResult.error,
      productUpsellSettings: productUpsellSettingsResult.error,
      categoryRelatedCategories: categoryRelatedCategoriesResult.error,
      optionGroups: optionGroupsResult.error,
      optionValues: optionValuesResult.error,
      landingPages: landingPagesMigrationMissing ? null : landingPagesResult.error,
    },
  };
}
