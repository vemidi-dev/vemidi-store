import type { PostgrestError, SupabaseClient } from "@supabase/supabase-js";

import {
  buildLandingPageRpcInput,
  type LandingPageFormPayload,
} from "@/lib/product-landing/admin-form";

export async function upsertProductLandingPageAtomic(
  supabase: SupabaseClient,
  payload: LandingPageFormPayload,
) {
  return supabase.rpc("admin_upsert_product_landing_page", buildLandingPageRpcInput(payload));
}

export async function deleteProductLandingPageAtomic(
  supabase: SupabaseClient,
  landingId: string,
) {
  return supabase.rpc("admin_delete_product_landing_page", {
    p_landing_id: landingId,
  });
}

const landingRpcErrorMessages: Record<string, string> = {
  admin_required: "Нямате администраторски права.",
  product_not_found: "Продуктът не е намерен.",
  landing_page_not_found: "Landing страницата не е намерена.",
  landing_title_required: "Заглавието е задължително.",
  invalid_landing_slug:
    "Slug може да съдържа само малки латински букви, цифри и единични тирета.",
  invalid_landing_campaign_code: "Campaign code е невалиден.",
  invalid_landing_sort_order: "Подредбата трябва да е цяло число ≥ 0.",
  primary_landing_must_be_active: "Primary landing страницата трябва да е активна.",
  landing_product_transfer_not_allowed:
    "Landing записът не може да бъде прехвърлен към друг продукт.",
  landing_slug_taken: "Този landing slug вече се използва.",
};

export function isProductLandingPagesMigrationMissing(
  error: Pick<PostgrestError, "code" | "message"> | null | undefined,
) {
  if (!error) {
    return false;
  }

  if (error.code === "42P01" || error.code === "PGRST205") {
    return true;
  }

  const message = error.message ?? "";
  return (
    /product_landing_pages/i.test(message) &&
    /(does not exist|Could not find the table)/i.test(message)
  );
}

export function isProductLandingPageAdminRpcMissing(
  error: Pick<PostgrestError, "code" | "message"> | null | undefined,
) {
  const message = error?.message ?? "";
  return /Could not find the function public\.admin_(upsert|delete)_product_landing_page/i.test(
    message,
  );
}

export function getLandingPageMutationErrorMessage(
  error: Pick<PostgrestError, "code" | "message" | "details" | "hint"> | null | undefined,
) {
  const message = [error?.message, error?.details, error?.hint].filter(Boolean).join(" ");

  if (!message) {
    return "Неуспешна операция с landing страницата.";
  }

  if (isProductLandingPageAdminRpcMissing(error)) {
    return "Липсва Supabase migration product_landing_page_admin.sql.";
  }

  if (isProductLandingPagesMigrationMissing(error)) {
    return "Липсва Supabase migration product_landing_pages.sql.";
  }

  if (
    error?.code === "42501" ||
    message.toLowerCase().includes("permission denied")
  ) {
    return "Липсват права за запис на landing страници.";
  }

  const knownError = Object.entries(landingRpcErrorMessages).find(([code]) =>
    message.includes(code),
  );
  return (
    knownError?.[1] ??
    `Неуспешна операция с landing страницата (${error?.code || "Supabase"}).`
  );
}

export const LANDING_PAGES_MIGRATION_WARNING =
  "Landing страниците изискват Supabase migrations product_landing_pages.sql и product_landing_page_admin.sql.";
