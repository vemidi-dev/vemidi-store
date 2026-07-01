import type {
  AdminTab,
  ProductCreateDraft,
  ProductDraftColorField,
  ProductDraftOptionGroup,
  ProductDraftPersonalizationField,
} from "@/lib/admin/types";
import { normalizeProductPublicationStatus } from "@/lib/product-publication";

export function firstValue(value: string | string[] | undefined) {
  if (!value) {
    return "";
  }
  return Array.isArray(value) ? value[0] ?? "" : value;
}

export function normalizeAdminTab(value: string): AdminTab {
  if (
    value === "categories" ||
    value === "colors" ||
    value === "promotions" ||
    value === "orders" ||
    value === "withdrawals" ||
    value === "blog" ||
    value === "events" ||
    value === "wishes" ||
    value === "subscribers" ||
    value === "content" ||
    value === "faq"
  ) {
    return value;
  }
  return "products";
}

export function normalizeFaqScopeFilter(value: string): "global" | "product" {
  return value === "product" ? "product" : "global";
}

export function makeAdminTabHref(tab: AdminTab) {
  return tab === "products" ? "/admin" : `/admin?tab=${tab}`;
}

function toNonNegativeInteger(value: string, fallback: number) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) {
    return fallback;
  }
  return parsed;
}

export function parseProductCreateDraft(raw: string): ProductCreateDraft | null {
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as {
      name?: unknown;
      slug?: unknown;
      subtitle?: unknown;
      heading_subtitle?: unknown;
      description?: unknown;
      additional_info?: unknown;
      personalization_info?: unknown;
      dimensions_materials?: unknown;
      ordering_info?: unknown;
      fulfillment_note?: unknown;
      price?: unknown;
      is_customizable?: unknown;
      is_sold_out?: unknown;
      fulfillment_type?: unknown;
      stock_quantity?: unknown;
      card_badge?: unknown;
      category_ids?: unknown;
      primary_category_id?: unknown;
      color_fields?: unknown;
      personalization_fields?: unknown;
      wish_template_ids?: unknown;
      option_groups?: unknown;
      status?: unknown;
    };

    const categoryIds = Array.isArray(parsed.category_ids)
      ? parsed.category_ids.filter(
          (value): value is string => typeof value === "string" && value.trim().length > 0,
        )
      : [];

    const colorFields = Array.isArray(parsed.color_fields)
      ? parsed.color_fields
          .map((field) => {
            if (!field || typeof field !== "object") {
              return null;
            }

            const candidate = field as {
              label?: unknown;
              group_id?: unknown;
              min_select?: unknown;
              max_select?: unknown;
              option_ids?: unknown;
            };
            const label = typeof candidate.label === "string" ? candidate.label : "";
            const groupId = typeof candidate.group_id === "string" ? candidate.group_id : "";
            const minSelect = toNonNegativeInteger(
              typeof candidate.min_select === "string" ? candidate.min_select : "",
              0,
            );
            const maxSelect = Math.max(
              1,
              toNonNegativeInteger(
                typeof candidate.max_select === "string" ? candidate.max_select : "",
                1,
              ),
            );
            const optionIds =
              typeof candidate.option_ids === "string"
                ? candidate.option_ids
                    .split(",")
                    .map((value) => value.trim())
                    .filter(Boolean)
                : [];

            if (!label && !groupId && optionIds.length === 0) {
              return null;
            }

            return { label, groupId, minSelect, maxSelect, optionIds };
          })
          .filter((field): field is ProductDraftColorField => field !== null)
      : [];

    const personalizationFields = Array.isArray(parsed.personalization_fields)
      ? parsed.personalization_fields
          .map((field) => {
            if (!field || typeof field !== "object") {
              return null;
            }
            const candidate = field as {
              label?: unknown;
              field_key?: unknown;
              field_type?: unknown;
              placeholder?: unknown;
              max_length?: unknown;
              price_delta?: unknown;
              is_required?: unknown;
              allows_wish_templates?: unknown;
            };
            const type =
              candidate.field_type === "textarea" || candidate.field_type === "date"
                ? candidate.field_type
                : "text";
            const maxLength = Math.min(
              1000,
              Math.max(
                1,
                toNonNegativeInteger(
                  typeof candidate.max_length === "string"
                    ? candidate.max_length
                    : "",
                  type === "date" ? 10 : 100,
                ),
              ),
            );
            const result: ProductDraftPersonalizationField = {
              label: typeof candidate.label === "string" ? candidate.label : "",
              key:
                typeof candidate.field_key === "string"
                  ? candidate.field_key
                  : "",
              type,
              placeholder:
                typeof candidate.placeholder === "string"
                  ? candidate.placeholder
                  : "",
              maxLength,
              priceDelta:
                typeof candidate.price_delta === "string" ||
                typeof candidate.price_delta === "number"
                  ? Math.max(0, Number(candidate.price_delta) || 0)
                  : 0,
              required: candidate.is_required === true,
              allowsWishTemplates:
                type === "textarea" && candidate.allows_wish_templates === true,
            };
            return result.label && result.key ? result : null;
          })
          .filter(
            (field): field is ProductDraftPersonalizationField => field !== null,
          )
      : [];
    const wishTemplateIds = Array.isArray(parsed.wish_template_ids)
      ? parsed.wish_template_ids.filter(
          (value): value is string =>
            typeof value === "string" && value.trim().length > 0,
        )
      : [];
    const optionGroups = Array.isArray(parsed.option_groups)
      ? parsed.option_groups
          .map((group) => {
            if (!group || typeof group !== "object") {
              return null;
            }

            const candidate = group as ProductDraftOptionGroup;
            const inputType =
              candidate.inputType === "multiple" ||
              candidate.inputType === "text" ||
              candidate.inputType === "textarea" ||
              candidate.inputType === "date"
                ? candidate.inputType
                : "single";
            const values = Array.isArray(candidate.values)
              ? candidate.values.filter(
                  (value) =>
                    value &&
                    typeof value.label === "string" &&
                    typeof value.key === "string",
                )
              : [];

            if (typeof candidate.name !== "string" || !candidate.name.trim()) {
              return null;
            }

            return {
              id: typeof candidate.id === "string" ? candidate.id : null,
              name: candidate.name,
              key:
                typeof candidate.key === "string" && candidate.key
                  ? candidate.key
                  : "option",
              inputType,
              isRequired: candidate.isRequired === true,
              minSelect:
                typeof candidate.minSelect === "number"
                  ? Math.max(0, candidate.minSelect)
                  : inputType === "single"
                    ? 1
                    : 0,
              maxSelect:
                typeof candidate.maxSelect === "number"
                  ? Math.max(0, candidate.maxSelect)
                  : inputType === "single"
                    ? 1
                    : 0,
              sortOrder:
                typeof candidate.sortOrder === "number" ? candidate.sortOrder : 0,
              isActive: candidate.isActive !== false,
              pricingMode: "delta" as const,
              dependsOnOptionId:
                typeof candidate.dependsOnOptionId === "string" &&
                candidate.dependsOnOptionId
                  ? candidate.dependsOnOptionId
                  : null,
              placeholder:
                typeof candidate.placeholder === "string"
                  ? candidate.placeholder
                  : null,
              maxLength:
                typeof candidate.maxLength === "number"
                  ? Math.min(1000, Math.max(1, candidate.maxLength))
                  : null,
              textPriceDelta:
                typeof candidate.textPriceDelta === "number"
                  ? Math.max(0, candidate.textPriceDelta)
                  : 0,
              values,
            };
          })
          .filter((group): group is ProductDraftOptionGroup => group !== null)
      : [];

    return {
      name: typeof parsed.name === "string" ? parsed.name : "",
      slug: typeof parsed.slug === "string" ? parsed.slug : "",
      subtitle: typeof parsed.subtitle === "string" ? parsed.subtitle : "",
      headingSubtitle:
        typeof parsed.heading_subtitle === "string" ? parsed.heading_subtitle : "",
      description: typeof parsed.description === "string" ? parsed.description : "",
      additionalInfo: typeof parsed.additional_info === "string" ? parsed.additional_info : "",
      personalizationInfo:
        typeof parsed.personalization_info === "string" ? parsed.personalization_info : "",
      dimensionsMaterials:
        typeof parsed.dimensions_materials === "string" ? parsed.dimensions_materials : "",
      orderingInfo: typeof parsed.ordering_info === "string" ? parsed.ordering_info : "",
      fulfillmentNote:
        typeof parsed.fulfillment_note === "string" ? parsed.fulfillment_note : "",
      price: typeof parsed.price === "string" ? parsed.price : "",
      isCustomizable: parsed.is_customizable === true,
      isSoldOut: parsed.is_sold_out === true,
      fulfillmentType:
        parsed.fulfillment_type === "stocked" || parsed.fulfillment_type === "unavailable"
          ? parsed.fulfillment_type
          : "made_to_order",
      stockQuantity:
        typeof parsed.stock_quantity === "string" && parsed.stock_quantity.trim()
          ? Number.parseInt(parsed.stock_quantity, 10)
          : null,
      cardBadge: typeof parsed.card_badge === "string" ? parsed.card_badge : "",
      categoryIds,
      primaryCategoryId:
        typeof parsed.primary_category_id === "string" &&
        parsed.primary_category_id.trim()
          ? parsed.primary_category_id
          : null,
      colorFields,
      personalizationFields,
      wishTemplateIds,
      optionGroups,
      publicationStatus: normalizeProductPublicationStatus(parsed.status, "draft"),
    };
  } catch {
    return null;
  }
}
