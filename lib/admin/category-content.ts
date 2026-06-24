import { adminFormFields } from "@/lib/admin/form-fields";
import type { CategoryRow } from "@/lib/admin/types";

export const categoryContentLimits = {
  hero_description: 500,
  listing_heading: 120,
  intro_text: 2000,
  seo_body: 10000,
  meta_title: 120,
  meta_description: 160,
  og_title: 120,
  og_description: 160,
} as const;

export type CategoryContentPayload = {
  hero_description: string | null;
  listing_heading: string | null;
  intro_text: string | null;
  seo_body: string | null;
  meta_title: string | null;
  meta_description: string | null;
  og_title: string | null;
  og_description: string | null;
  robots_index: boolean | null;
};

const fieldLabels: Record<keyof typeof categoryContentLimits, string> = {
  hero_description: "Описание в горната част",
  listing_heading: "Заглавие над продуктите",
  intro_text: "Уводен текст",
  seo_body: "Подробен текст под продуктите",
  meta_title: "SEO заглавие",
  meta_description: "Meta описание",
  og_title: "Заглавие при споделяне",
  og_description: "Описание при споделяне",
};

function parseOptionalTextField(
  formData: FormData,
  key: string,
  maxLength: number,
  label: string,
): { value: string | null; error: string | null } {
  const raw = String(formData.get(key) ?? "");
  const trimmed = raw.trim();
  if (!trimmed) {
    return { value: null, error: null };
  }
  if (trimmed.length > maxLength) {
    return {
      value: null,
      error: `${label} надхвърля максимума от ${maxLength} символа.`,
    };
  }
  return { value: trimmed, error: null };
}

export function parseCategoryRobotsIndex(formData: FormData): boolean | null {
  const raw = String(formData.get(adminFormFields.category.robotsIndex) ?? "").trim();
  if (!raw || raw === "auto") {
    return null;
  }
  if (raw === "true") {
    return true;
  }
  if (raw === "false") {
    return false;
  }
  return null;
}

export function getCategoryRobotsIndexSelectValue(
  robotsIndex: boolean | null | undefined,
): string {
  if (robotsIndex === true) {
    return "true";
  }
  if (robotsIndex === false) {
    return "false";
  }
  return "auto";
}

export function parseCategoryContentFromFormData(formData: FormData): {
  payload: CategoryContentPayload;
  error: string | null;
} {
  const fields = [
    {
      key: adminFormFields.category.heroDescription,
      limitKey: "hero_description" as const,
    },
    {
      key: adminFormFields.category.listingHeading,
      limitKey: "listing_heading" as const,
    },
    {
      key: adminFormFields.category.introText,
      limitKey: "intro_text" as const,
    },
    {
      key: adminFormFields.category.seoBody,
      limitKey: "seo_body" as const,
    },
    {
      key: adminFormFields.category.metaTitle,
      limitKey: "meta_title" as const,
    },
    {
      key: adminFormFields.category.metaDescription,
      limitKey: "meta_description" as const,
    },
    {
      key: adminFormFields.category.ogTitle,
      limitKey: "og_title" as const,
    },
    {
      key: adminFormFields.category.ogDescription,
      limitKey: "og_description" as const,
    },
  ];

  const payload: CategoryContentPayload = {
    hero_description: null,
    listing_heading: null,
    intro_text: null,
    seo_body: null,
    meta_title: null,
    meta_description: null,
    og_title: null,
    og_description: null,
    robots_index: parseCategoryRobotsIndex(formData),
  };

  for (const field of fields) {
    const limit = categoryContentLimits[field.limitKey];
    const label = fieldLabels[field.limitKey];
    const parsed = parseOptionalTextField(formData, field.key, limit, label);
    if (parsed.error) {
      return { payload, error: parsed.error };
    }
    payload[field.limitKey] = parsed.value;
  }

  return { payload, error: null };
}

export function hasCategoryContentGap(
  category: Pick<
    CategoryRow,
    "hero_description" | "intro_text" | "seo_body" | "meta_description"
  >,
): boolean {
  return ![
    category.hero_description,
    category.intro_text,
    category.seo_body,
    category.meta_description,
  ].some((value) => typeof value === "string" && value.trim().length > 0);
}

export function getCategoryContentFormDefaults(
  category?: Pick<
    CategoryRow,
    | "hero_description"
    | "listing_heading"
    | "intro_text"
    | "seo_body"
    | "meta_title"
    | "meta_description"
    | "og_title"
    | "og_description"
    | "robots_index"
  >,
) {
  return {
    hero_description: category?.hero_description ?? "",
    listing_heading: category?.listing_heading ?? "",
    intro_text: category?.intro_text ?? "",
    seo_body: category?.seo_body ?? "",
    meta_title: category?.meta_title ?? "",
    meta_description: category?.meta_description ?? "",
    og_title: category?.og_title ?? "",
    og_description: category?.og_description ?? "",
    robots_index: getCategoryRobotsIndexSelectValue(category?.robots_index),
  };
}
