"use server";

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

  if (!code) {
    done("error", "Кодът трябва да е 4–32 символа (A–Z, 0–9).");
  }

  if (!Number.isFinite(percentage) || percentage <= 0 || percentage > 100) {
    done("error", "Процентът трябва да е между 0 и 100 (без 0).");
  }

  const { error } = await supabase.from("discount_coupons").insert({
    code,
    discount_percentage: percentage,
    is_active: isActive,
  });

  if (error) {
    if (error.code === "23505") {
      done("error", "Този код вече съществува.");
    }
    done("error", "Купонът не беше създаден.");
  }

  done("success", `Купон ${code} е създаден.`);
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
