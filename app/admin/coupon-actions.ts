"use server";

import { randomInt } from "crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getString } from "@/lib/admin/form-data";
import { adminFormFields } from "@/lib/admin/form-fields";
import { normalizeCouponCode } from "@/lib/checkout/coupon";
import { checkIsAdmin } from "@/lib/supabase/admin-auth";
import { createClient } from "@/lib/supabase/server";

function done(kind: "success" | "error", message: string): never {
  revalidatePath("/admin");
  redirect(`/admin?tab=promotions&${kind}=${encodeURIComponent(message)}`);
}

const COUPON_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const BULK_COUPON_SUFFIX_LENGTH = 6;
const BULK_COUPON_MAX_COUNT = 100;

async function getAuthorizedClient() {
  const supabase = await createClient();
  if (!supabase) {
    redirect("/admin/login");
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/admin/login");
  }

  const { isAdmin } = await checkIsAdmin(supabase, user.id);
  if (!isAdmin) {
    redirect("/admin/login");
  }

  return supabase;
}

function parseExpiresAt(raw: string): string | null | "invalid" {
  const value = raw.trim();
  if (!value) {
    return null;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "invalid";
  }

  return date.toISOString();
}

function normalizeCouponPrefix(raw: string) {
  return raw
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
}

function generateCouponSuffix(length = BULK_COUPON_SUFFIX_LENGTH) {
  let suffix = "";
  for (let index = 0; index < length; index += 1) {
    suffix += COUPON_ALPHABET[randomInt(0, COUPON_ALPHABET.length)];
  }
  return suffix;
}

async function generateUniqueCouponCodes(
  supabase: Awaited<ReturnType<typeof getAuthorizedClient>>,
  prefix: string,
  count: number,
) {
  const generated = new Set<string>();
  let attempts = 0;

  while (generated.size < count && attempts < 20) {
    attempts += 1;
    const batch = new Set<string>();
    const remaining = count - generated.size;
    const batchSize = Math.min(BULK_COUPON_MAX_COUNT * 2, Math.max(remaining * 3, 12));

    while (batch.size < batchSize) {
      const code = `${prefix}${generateCouponSuffix()}`;
      if (normalizeCouponCode(code)) {
        batch.add(code);
      }
    }

    const candidates = Array.from(batch).filter((code) => !generated.has(code));
    const { data, error } = await supabase
      .from("discount_coupons")
      .select("code")
      .in("code", candidates);

    if (error) {
      throw error;
    }

    const existingCodes = new Set((data ?? []).map((row) => String(row.code).toUpperCase()));
    for (const code of candidates) {
      if (!existingCodes.has(code)) {
        generated.add(code);
      }
      if (generated.size >= count) {
        break;
      }
    }
  }

  return Array.from(generated);
}

export async function createDiscountCoupon(formData: FormData) {
  const supabase = await getAuthorizedClient();
  const code = normalizeCouponCode(getString(formData, adminFormFields.discountCoupon.code));
  const percentageRaw = getString(
    formData,
    adminFormFields.discountCoupon.discountPercentage,
  ).replace(",", ".");
  const percentage = Number(percentageRaw);
  const isActive =
    formData.get(adminFormFields.discountCoupon.isActive) === "on" ||
    formData.get(adminFormFields.discountCoupon.isActive) === "true";
  const expiresAt = parseExpiresAt(
    getString(formData, adminFormFields.discountCoupon.expiresAt),
  );

  if (!code) {
    done("error", "Кодът трябва да е 4–32 символа (A–Z, 0–9).");
  }

  if (!Number.isFinite(percentage) || percentage <= 0 || percentage > 100) {
    done("error", "Процентът трябва да е между 0 и 100 (без 0).");
  }

  if (expiresAt === "invalid") {
    done("error", "Невалидна дата за „Валиден до“.");
  }

  const { error } = await supabase.from("discount_coupons").insert({
    code,
    discount_percentage: percentage,
    is_active: isActive,
    expires_at: expiresAt,
  });

  if (error) {
    if (error.code === "23505") {
      done("error", "Този код вече съществува.");
    }
    done("error", "Купонът не беше създаден.");
  }

  done("success", `Купон ${code} е създаден.`);
}

export async function createDiscountCouponBatch(formData: FormData) {
  const supabase = await getAuthorizedClient();
  const prefix = normalizeCouponPrefix(
    getString(formData, adminFormFields.discountCoupon.bulkPrefix),
  );
  const countRaw = getString(formData, adminFormFields.discountCoupon.bulkCount);
  const count = Number(countRaw);
  const percentageRaw = getString(
    formData,
    adminFormFields.discountCoupon.discountPercentage,
  ).replace(",", ".");
  const percentage = Number(percentageRaw);
  const isActive =
    formData.get(adminFormFields.discountCoupon.isActive) === "on" ||
    formData.get(adminFormFields.discountCoupon.isActive) === "true";
  const expiresAt = parseExpiresAt(
    getString(formData, adminFormFields.discountCoupon.expiresAt),
  );

  if (!prefix || prefix.length > 26) {
    done("error", "Префиксът трябва да съдържа 1–26 символа (A–Z, 0–9).");
  }

  if (!Number.isInteger(count) || count < 1 || count > BULK_COUPON_MAX_COUNT) {
    done("error", `Броят купони трябва да е между 1 и ${BULK_COUPON_MAX_COUNT}.`);
  }

  if (!Number.isFinite(percentage) || percentage <= 0 || percentage > 100) {
    done("error", "Процентът трябва да е между 0 и 100 (без 0).");
  }

  if (expiresAt === "invalid") {
    done("error", "Невалидна дата за „Валиден до“.");
  }

  let codes: string[];
  try {
    codes = await generateUniqueCouponCodes(supabase, prefix, count);
  } catch {
    done("error", "Кодовете не можаха да бъдат проверени за дублиране.");
  }

  if (codes.length !== count) {
    done("error", "Не успяхме да генерираме достатъчно уникални кодове. Опитайте с друг префикс.");
  }

  const { error } = await supabase.from("discount_coupons").insert(
    codes.map((code) => ({
      code,
      discount_percentage: percentage,
      is_active: isActive,
      expires_at: expiresAt,
    })),
  );

  if (error) {
    if (error.code === "23505") {
      done("error", "Някой от генерираните кодове вече съществува. Опитайте отново.");
    }
    done("error", "Серията купони не беше създадена.");
  }

  const preview = codes.slice(0, 8).join(", ");
  const suffix = codes.length > 8 ? ` и още ${codes.length - 8}` : "";
  done("success", `Създадени са ${codes.length} купона: ${preview}${suffix}.`);
}

export async function setDiscountCouponActive(formData: FormData) {
  const supabase = await getAuthorizedClient();
  const id = getString(formData, adminFormFields.discountCoupon.id);
  const isActive = getString(formData, adminFormFields.discountCoupon.isActive) === "true";

  if (!id) {
    done("error", "Липсва идентификатор на купона.");
  }

  const { error } = await supabase
    .from("discount_coupons")
    .update({ is_active: isActive })
    .eq("id", id);

  if (error) {
    done("error", "Статусът на купона не беше обновен.");
  }

  done("success", isActive ? "Купонът е активиран." : "Купонът е деактивиран.");
}
