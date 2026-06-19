import { isUuid } from "@/lib/is-uuid";

export const LANDING_SLUG_MAX_LENGTH = 80;
export const LANDING_CAMPAIGN_CODE_MAX_LENGTH = 64;

export type LandingSlugValidationResult =
  | { ok: true; slug: string }
  | { ok: false; code: "empty" | "invalid" | "uuid" | "too_long" };

export type LandingCampaignCodeValidationResult =
  | { ok: true; campaignCode: string | null }
  | { ok: false; code: "invalid" | "too_long" };

export function validateLandingSlug(raw: string): LandingSlugValidationResult {
  const slug = raw.trim().toLowerCase();

  if (!slug) {
    return { ok: false, code: "empty" };
  }

  if (slug.length > LANDING_SLUG_MAX_LENGTH) {
    return { ok: false, code: "too_long" };
  }

  if (isUuid(slug)) {
    return { ok: false, code: "uuid" };
  }

  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    return { ok: false, code: "invalid" };
  }

  return { ok: true, slug };
}

export function normalizeLandingSlug(raw: unknown): string | null {
  if (typeof raw !== "string") {
    return null;
  }

  const result = validateLandingSlug(raw);
  return result.ok ? result.slug : null;
}

export function validateLandingCampaignCode(
  raw: string,
): LandingCampaignCodeValidationResult {
  const trimmed = raw.trim();

  if (!trimmed) {
    return { ok: true, campaignCode: null };
  }

  const campaignCode = trimmed
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, LANDING_CAMPAIGN_CODE_MAX_LENGTH);

  if (!campaignCode) {
    return { ok: false, code: "invalid" };
  }

  if (campaignCode.length > LANDING_CAMPAIGN_CODE_MAX_LENGTH) {
    return { ok: false, code: "too_long" };
  }

  if (!/^[a-z0-9][a-z0-9_-]*$/.test(campaignCode)) {
    return { ok: false, code: "invalid" };
  }

  return { ok: true, campaignCode };
}

export function normalizeLandingCampaignCode(raw: unknown): string | null {
  if (typeof raw !== "string") {
    return null;
  }

  const result = validateLandingCampaignCode(raw);
  return result.ok ? result.campaignCode : null;
}
