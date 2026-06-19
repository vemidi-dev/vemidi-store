import { getOptionalString, getString, isChecked } from "@/lib/admin/form-data";
import { adminFormFields } from "@/lib/admin/form-fields";
import { applyPrimaryForcesActive } from "@/lib/product-landing/primary-switch";
import {
  normalizeLandingCampaignCode,
  normalizeLandingSlug,
  validateLandingCampaignCode,
  validateLandingSlug,
} from "@/lib/product-landing/validation";

export type LandingPageFormPayload = {
  landingId: string | null;
  productId: string;
  productSlug: string;
  title: string;
  slug: string;
  campaignCode: string | null;
  isPrimary: boolean;
  isActive: boolean;
  sortOrder: number;
};

export type LandingPageFormParseResult =
  | { ok: true; payload: LandingPageFormPayload }
  | { ok: false; message: string };

function parseSortOrder(raw: string) {
  if (!raw.trim()) {
    return 0;
  }

  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return null;
  }

  return parsed;
}

export function parseLandingPageFormData(formData: FormData): LandingPageFormParseResult {
  const productId = getString(formData, adminFormFields.landingPage.productId);
  const productSlug = getString(formData, adminFormFields.landingPage.productSlug);
  const title = getString(formData, adminFormFields.landingPage.title);
  const rawSlug = getString(formData, adminFormFields.landingPage.slug);
  const rawCampaignCode = getOptionalString(
    formData,
    adminFormFields.landingPage.campaignCode,
  );
  const landingId = getOptionalString(formData, adminFormFields.landingPage.id);
  const sortOrder = parseSortOrder(
    getString(formData, adminFormFields.landingPage.sortOrder),
  );

  if (!productId || !productSlug || !title) {
    return { ok: false, message: "Попълнете заглавие и продукт." };
  }

  if (sortOrder === null) {
    return { ok: false, message: "Подредбата трябва да е цяло число ≥ 0." };
  }

  const slugValidation = validateLandingSlug(rawSlug);
  if (!slugValidation.ok) {
    return {
      ok: false,
      message:
        slugValidation.code === "empty"
          ? "Slug е задължителен."
          : "Slug може да съдържа само малки латински букви, цифри и единични тирета.",
    };
  }

  const campaignValidation = validateLandingCampaignCode(rawCampaignCode ?? "");
  if (!campaignValidation.ok) {
    return { ok: false, message: "Campaign code е невалиден." };
  }

  const normalizedPrimary = applyPrimaryForcesActive(
    isChecked(formData, adminFormFields.landingPage.isPrimary),
    isChecked(formData, adminFormFields.landingPage.isActive),
  );

  return {
    ok: true,
    payload: {
      landingId: landingId || null,
      productId,
      productSlug,
      title: title.trim(),
      slug: slugValidation.slug,
      campaignCode: campaignValidation.campaignCode,
      isPrimary: normalizedPrimary.isPrimary,
      isActive: normalizedPrimary.isActive,
      sortOrder,
    },
  };
}

export function buildLandingPageRpcInput(payload: LandingPageFormPayload) {
  return {
    p_landing_id: payload.landingId,
    p_product_id: payload.productId,
    p_title: payload.title,
    p_slug: payload.slug,
    p_campaign_code: payload.campaignCode ?? "",
    p_is_primary: payload.isPrimary,
    p_is_active: payload.isActive,
    p_sort_order: payload.sortOrder,
  };
}

export function normalizeLandingPageDraft(input: {
  title?: unknown;
  slug?: unknown;
  campaignCode?: unknown;
}) {
  return {
    title: typeof input.title === "string" ? input.title.trim() : "",
    slug: normalizeLandingSlug(input.slug) ?? "",
    campaignCode: normalizeLandingCampaignCode(input.campaignCode),
  };
}
