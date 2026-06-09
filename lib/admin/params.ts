import type {
  AdminTab,
  ProductCreateDraft,
  ProductDraftColorField,
} from "@/lib/admin/types";

export function firstValue(value: string | string[] | undefined) {
  if (!value) {
    return "";
  }
  return Array.isArray(value) ? value[0] ?? "" : value;
}

export function normalizeAdminTab(value: string): AdminTab {
  if (
    value === "categories" ||
    value === "orders" ||
    value === "blog" ||
    value === "events" ||
    value === "wishes"
  ) {
    return value;
  }
  return "products";
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
      description?: unknown;
      additional_info?: unknown;
      fulfillment_note?: unknown;
      price?: unknown;
      is_customizable?: unknown;
      category_ids?: unknown;
      color_fields?: unknown;
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

    return {
      name: typeof parsed.name === "string" ? parsed.name : "",
      description: typeof parsed.description === "string" ? parsed.description : "",
      additionalInfo: typeof parsed.additional_info === "string" ? parsed.additional_info : "",
      fulfillmentNote:
        typeof parsed.fulfillment_note === "string" ? parsed.fulfillment_note : "",
      price: typeof parsed.price === "string" ? parsed.price : "",
      isCustomizable: parsed.is_customizable === true,
      categoryIds,
      colorFields,
    };
  } catch {
    return null;
  }
}
