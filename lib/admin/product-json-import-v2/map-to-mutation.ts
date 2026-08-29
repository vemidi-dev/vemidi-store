import { normalizeProductCardBadge } from "@/lib/product-card";
import { normalizeFulfillmentType, parseStockQuantity } from "@/lib/product-fulfillment";
import { normalizeProductVisibility } from "@/lib/product-visibility";
import {
  MAX_PERSONALIZATION_FIELDS,
  MAX_PRODUCT_HEADING_SUBTITLE_LENGTH,
  MAX_PRODUCT_IMAGE_ALT_LENGTH,
  MAX_PRODUCT_META_DESCRIPTION_LENGTH,
  MAX_PRODUCT_META_TITLE_LENGTH,
  MAX_PRODUCT_NAME_LENGTH,
  MAX_PRODUCT_OG_DESCRIPTION_LENGTH,
  MAX_PRODUCT_OG_TITLE_LENGTH,
  MAX_PRODUCT_SUBTITLE_LENGTH,
  PRODUCT_CODE_PATTERN,
  TARGET_FILENAME_PATTERN,
} from "@/lib/admin/product-json-import-v2/constants";
import type {
  ImageImportV2,
  ImportDefaultsV2,
  NormalizedProductImportV2,
  PersonalizationFieldImportV2,
  ProductImportMapResult,
  ProductImportMutationPayload,
  ProductImportV2Raw,
  ProductJsonImportIssue,
  QuantityPriceTierImportV2,
} from "@/lib/admin/product-json-import-v2/types";
import type { ParsedPersonalizationField } from "@/lib/admin/types";
import {
  normalizeQuantityPriceTiers,
  validateQuantityPriceTierRanges,
} from "@/lib/product-quantity-pricing";

function asTrimmedString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function asOptionalTrimmedString(value: unknown): string | null {
  const trimmed = asTrimmedString(value);
  return trimmed ? trimmed : null;
}

function asBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function asNullableBoolean(value: unknown): boolean | null {
  if (value === true || value === false) {
    return value;
  }
  return null;
}

function parsePrice(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    return null;
  }

  if (Math.abs(value * 100 - Math.round(value * 100)) > 1e-9) {
    return null;
  }

  return Math.round(value * 100) / 100;
}

function parseImages(value: unknown): ImageImportV2[] | null {
  if (!Array.isArray(value)) {
    return null;
  }

  const images: ImageImportV2[] = [];
  for (const entry of value) {
    if (typeof entry !== "object" || entry === null) {
      return null;
    }

    const record = entry as Record<string, unknown>;
    const originalFilename = asTrimmedString(record.original_filename);
    const alt = asTrimmedString(record.alt);
    if (!originalFilename || !alt) {
      return null;
    }

    images.push({
      original_filename: originalFilename,
      alt,
      ...(typeof record.target_filename === "string" && record.target_filename.trim()
        ? { target_filename: record.target_filename.trim() }
        : {}),
      ...(record.primary === true ? { primary: true } : {}),
    });
  }

  return images;
}

function parsePersonalizationFields(
  value: unknown,
): PersonalizationFieldImportV2[] | null {
  if (value === undefined || value === null) {
    return [];
  }

  if (!Array.isArray(value)) {
    return null;
  }

  const fields: PersonalizationFieldImportV2[] = [];
  for (const entry of value) {
    if (typeof entry !== "object" || entry === null) {
      return null;
    }

    const record = entry as Record<string, unknown>;
    const label = asTrimmedString(record.label);
    const fieldKey = asTrimmedString(record.field_key);
    const fieldType = asTrimmedString(record.field_type);
    if (
      !label ||
      !fieldKey ||
      (fieldType !== "text" && fieldType !== "textarea" && fieldType !== "date")
    ) {
      return null;
    }

    fields.push({
      label,
      field_key: fieldKey,
      field_type: fieldType,
      ...(typeof record.placeholder === "string"
        ? { placeholder: record.placeholder.trim() }
        : {}),
      ...(typeof record.max_length === "number"
        ? { max_length: record.max_length }
        : {}),
      ...(typeof record.price_delta === "number"
        ? { price_delta: record.price_delta }
        : {}),
      ...(typeof record.required === "boolean"
        ? { required: record.required }
        : {}),
      ...(typeof record.allows_wish_templates === "boolean"
        ? { allows_wish_templates: record.allows_wish_templates }
        : {}),
      ...(typeof record.sort_order === "number"
        ? { sort_order: record.sort_order }
        : {}),
    });
  }

  return fields;
}

function parseCategorySlugs(value: unknown): string[] | null {
  if (!Array.isArray(value)) {
    return null;
  }

  const slugs = value
    .map((entry) => (typeof entry === "string" ? entry.trim().toLowerCase() : ""))
    .filter(Boolean);

  return slugs.length > 0 ? slugs : null;
}

function toParsedPersonalizationFields(
  fields: PersonalizationFieldImportV2[],
): ParsedPersonalizationField[] {
  return fields.map((field, index) => ({
    label: field.label,
    key: field.field_key,
    type: field.field_type,
    placeholder: field.placeholder ?? "",
    maxLength: field.field_type === "date" ? 10 : (field.max_length ?? 100),
    priceDelta: field.price_delta ?? 0,
    required: field.required ?? false,
    allowsWishTemplates:
      field.field_type === "textarea" && (field.allows_wish_templates ?? false),
    sortOrder: field.sort_order ?? index,
  }));
}

function collectTargetFilenameWarnings(
  slug: string,
  images: ImageImportV2[],
): ProductJsonImportIssue[] {
  const warnings: ProductJsonImportIssue[] = [];

  for (const image of images) {
    if (
      image.target_filename &&
      !TARGET_FILENAME_PATTERN.test(image.target_filename)
    ) {
      warnings.push({
        code: "TARGET_FILENAME_PATTERN",
        severity: "warning",
        slug,
        message: `target_filename „${image.target_filename}" не следва препоръчителния шаблон.`,
      });
    }
  }

  return warnings;
}

export function normalizeProductImportV2(
  raw: ProductImportV2Raw,
  defaults: ImportDefaultsV2 | undefined,
  slugHint: string,
): { product: NormalizedProductImportV2 | null; warnings: ProductJsonImportIssue[] } {
  const warnings: ProductJsonImportIssue[] = [];
  const slug = asTrimmedString(raw.slug).toLowerCase();
  const name = asTrimmedString(raw.name);
  const description = asTrimmedString(raw.description);
  const price = parsePrice(raw.price);
  const categorySlugs = parseCategorySlugs(raw.categories);
  const primaryCategorySlug = asTrimmedString(raw.primary_category).toLowerCase();
  const images = parseImages(raw.images);
  const personalizationFieldsRaw = parsePersonalizationFields(raw.personalization_fields);

  let subtitle = asOptionalTrimmedString(raw.subtitle);
  const shortDescription = asOptionalTrimmedString(raw.short_description);
  if (!subtitle && shortDescription) {
    subtitle = shortDescription;
    warnings.push({
      code: "SHORT_DESCRIPTION_ALIAS",
      severity: "warning",
      slug: slug || slugHint,
      message: "short_description е v1 alias — използва се като subtitle.",
    });
  }

  let personalizationInfo = asOptionalTrimmedString(raw.personalization_info);
  const personalizationNotes = asOptionalTrimmedString(raw.personalization_notes);
  if (!personalizationInfo && personalizationNotes) {
    personalizationInfo = personalizationNotes;
    warnings.push({
      code: "PERSONALIZATION_NOTES_ALIAS",
      severity: "warning",
      slug: slug || slugHint,
      message:
        "personalization_notes е v1 alias — използва се като personalization_info.",
    });
  }

  const productCode = asOptionalTrimmedString(raw.product_code)?.toUpperCase() ?? null;
  if (productCode) {
    warnings.push({
      code: "PRODUCT_CODE_IGNORED",
      severity: "warning",
      slug: slug || slugHint,
      message: "product_code в JSON се игнорира — RPC генерира VM-XXXXXX.",
    });
    if (!PRODUCT_CODE_PATTERN.test(productCode)) {
      warnings.push({
        code: "PRODUCT_CODE_INVALID",
        severity: "warning",
        slug: slug || slugHint,
        message: "product_code не следва препоръчителния формат [A-Z0-9-]{2,32}.",
      });
    }
  }

  if (
    !name ||
    !slug ||
    price === null ||
    !description ||
    !categorySlugs ||
    !primaryCategorySlug ||
    !images ||
    personalizationFieldsRaw === null
  ) {
    return { product: null, warnings };
  }

  const personalizationFields = toParsedPersonalizationFields(personalizationFieldsRaw);
  const quantityTierValidation = validateQuantityPriceTierRanges(
    raw.quantity_price_tiers as QuantityPriceTierImportV2[] | undefined,
  );
  const quantityPriceTiers = quantityTierValidation.ok
    ? quantityTierValidation.tiers
    : normalizeQuantityPriceTiers(raw.quantity_price_tiers);

  const showQuantitySelector = asBoolean(
    raw.show_quantity_selector,
    defaults?.show_quantity_selector ?? false,
  );
  if (quantityPriceTiers.length > 0 && !showQuantitySelector) {
    warnings.push({
      code: "QUANTITY_TIERS_WITHOUT_SELECTOR",
      severity: "warning",
      slug,
      message:
        "quantity_price_tiers без show_quantity_selector — storefront UX може да е неясен.",
    });
  }

  warnings.push(...collectTargetFilenameWarnings(slug, images));

  const isCustomizable =
    asBoolean(raw.is_customizable, defaults?.is_customizable ?? false) ||
    personalizationFields.length > 0;

  const product: NormalizedProductImportV2 = {
    slug,
    name: name.slice(0, MAX_PRODUCT_NAME_LENGTH),
    productCode,
    price,
    subtitle: subtitle ? subtitle.slice(0, MAX_PRODUCT_SUBTITLE_LENGTH) : null,
    headingSubtitle: asOptionalTrimmedString(raw.heading_subtitle)?.slice(
      0,
      MAX_PRODUCT_HEADING_SUBTITLE_LENGTH,
    ) ?? null,
    description,
    additionalInfo: asOptionalTrimmedString(raw.additional_info),
    personalizationInfo,
    dimensionsMaterials: asOptionalTrimmedString(raw.dimensions_materials),
    orderingInfo: asOptionalTrimmedString(raw.ordering_info),
    fulfillmentNote: asOptionalTrimmedString(raw.fulfillment_note),
    cardBadge: normalizeProductCardBadge(asOptionalTrimmedString(raw.card_badge)),
    isSoldOut: asBoolean(raw.is_sold_out, false),
    isCustomizable,
    showQuantitySelector,
    promoCodeEligible: asBoolean(raw.promo_code_eligible, defaults?.promo_code_eligible ?? true),
    fulfillmentType: normalizeFulfillmentType(
      asOptionalTrimmedString(raw.fulfillment_type) ??
        defaults?.fulfillment_type ??
        "made_to_order",
    ),
    stockQuantity: parseStockQuantity(raw.stock_quantity as string | number | null | undefined),
    visibility: normalizeProductVisibility(
      asOptionalTrimmedString(raw.visibility) ?? defaults?.visibility,
    ),
    personalizationOpenByDefault:
      asNullableBoolean(raw.personalization_open_by_default) ??
      defaults?.personalization_open_by_default ??
      null,
    metaTitle: asOptionalTrimmedString(raw.meta_title)?.slice(0, MAX_PRODUCT_META_TITLE_LENGTH) ?? null,
    metaDescription:
      asOptionalTrimmedString(raw.meta_description)?.slice(
        0,
        MAX_PRODUCT_META_DESCRIPTION_LENGTH,
      ) ?? null,
    ogTitle: asOptionalTrimmedString(raw.og_title)?.slice(0, MAX_PRODUCT_OG_TITLE_LENGTH) ?? null,
    ogDescription:
      asOptionalTrimmedString(raw.og_description)?.slice(
        0,
        MAX_PRODUCT_OG_DESCRIPTION_LENGTH,
      ) ?? null,
    categorySlugs,
    primaryCategorySlug,
    personalizationFields,
    quantityPriceTiers,
    images: images.map((image) => ({
      ...image,
      alt: image.alt.slice(0, MAX_PRODUCT_IMAGE_ALT_LENGTH),
    })),
  };

  return { product, warnings };
}

export function mapNormalizedProductImportToMutation(
  product: NormalizedProductImportV2,
): ProductImportMutationPayload {
  return {
    slug: product.slug,
    categorySlugs: product.categorySlugs,
    primaryCategorySlug: product.primaryCategorySlug,
    mutationInput: {
      name: product.name,
      slug: product.slug,
      subtitle: product.subtitle,
      headingSubtitle: product.headingSubtitle,
      description: product.description,
      additionalInfo: product.additionalInfo,
      personalizationInfo: product.personalizationInfo,
      dimensionsMaterials: product.dimensionsMaterials,
      orderingInfo: product.orderingInfo,
      fulfillmentNote: product.fulfillmentNote,
      price: product.price,
      imageUrl: null,
      isCustomizable: product.isCustomizable,
      isSoldOut: product.isSoldOut,
      fulfillmentType: product.fulfillmentType,
      stockQuantity: product.stockQuantity,
      cardBadge: product.cardBadge,
      personalizationFields: product.personalizationFields,
      metaTitle: product.metaTitle,
      metaDescription: product.metaDescription,
      ogTitle: product.ogTitle,
      ogDescription: product.ogDescription,
    },
    postCreate: {
      visibility: product.visibility,
      showQuantitySelector: product.showQuantitySelector,
      promoCodeEligible: product.promoCodeEligible,
      quantityPriceTiers: product.quantityPriceTiers,
      personalizationOpenByDefault: product.personalizationOpenByDefault,
    },
  };
}

export function mapProductImportV2(
  raw: ProductImportV2Raw,
  defaults: ImportDefaultsV2 | undefined,
  slugHint: string,
): ProductImportMapResult {
  const { product, warnings } = normalizeProductImportV2(raw, defaults, slugHint);
  if (!product) {
    return { ok: false, warnings };
  }

  if (product.personalizationFields.length > MAX_PERSONALIZATION_FIELDS) {
    return { ok: false, warnings };
  }

  return {
    ok: true,
    payload: mapNormalizedProductImportToMutation(product),
    warnings,
  };
}
