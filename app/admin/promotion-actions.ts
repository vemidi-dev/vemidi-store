"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getString } from "@/lib/admin/form-data";
import { adminFormFields } from "@/lib/admin/form-fields";
import type { DiscountType } from "@/lib/product-pricing";
import { checkIsAdmin } from "@/lib/supabase/admin-auth";
import { createClient } from "@/lib/supabase/server";

function done(kind: "success" | "error", message: string): never {
  revalidatePath("/admin");
  revalidatePath("/shop");
  revalidatePath("/products/[slug]", "page");
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

function parseDateTime(value: string) {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function parseDiscountType(value: string): DiscountType | null {
  return value === "percentage" || value === "fixed_price" ? value : null;
}

function parseDiscountValue(value: string, discountType: DiscountType) {
  const parsed = Number(value.replace(",", "."));
  if (!Number.isFinite(parsed) || parsed < 0) {
    return null;
  }

  if (discountType === "percentage") {
    return parsed > 0 && parsed <= 100 ? parsed : null;
  }

  return parsed;
}

function parsePromotionPayload(formData: FormData) {
  const productId = getString(formData, adminFormFields.promotion.productId);
  const name = getString(formData, adminFormFields.promotion.name);
  const discountType = parseDiscountType(
    getString(formData, adminFormFields.promotion.discountType),
  );
  const discountValue = discountType
    ? parseDiscountValue(
        getString(formData, adminFormFields.promotion.discountValue),
        discountType,
      )
    : null;
  const startsAt = parseDateTime(getString(formData, adminFormFields.promotion.startsAt));
  const endsAt = parseDateTime(getString(formData, adminFormFields.promotion.endsAt));
  const isActive = formData.get(adminFormFields.promotion.isActive) === "on";

  if (!productId || !name || !discountType || discountValue == null || !startsAt || !endsAt) {
    return null;
  }

  if (new Date(endsAt).getTime() <= new Date(startsAt).getTime()) {
    return null;
  }

  return {
    productId,
    name,
    discountType,
    discountValue,
    startsAt,
    endsAt,
    isActive,
  };
}

function mapPromotionError(error: { message?: string; code?: string } | null) {
  if (!error) {
    return "Промоцията не беше записана.";
  }

  if (error.code === "23P01" || error.message?.includes("product_promotions_no_overlap")) {
    return "Вече има активна промоция за този продукт в припокриващ се период.";
  }

  return "Промоцията не беше записана.";
}

export async function createProductPromotion(formData: FormData) {
  const supabase = await getAuthorizedClient();
  const payload = parsePromotionPayload(formData);

  if (!payload) {
    done("error", "Попълнете коректно всички полета за промоцията.");
  }

  const { error } = await supabase.from("product_promotions").insert({
    product_id: payload.productId,
    name: payload.name,
    discount_type: payload.discountType,
    discount_value: payload.discountValue,
    starts_at: payload.startsAt,
    ends_at: payload.endsAt,
    is_active: payload.isActive,
  });

  done(error ? "error" : "success", error ? mapPromotionError(error) : "Промоцията е добавена.");
}

export async function updateProductPromotion(formData: FormData) {
  const supabase = await getAuthorizedClient();
  const id = getString(formData, adminFormFields.promotion.id);
  const payload = parsePromotionPayload(formData);

  if (!id || !payload) {
    done("error", "Невалидни данни за промоцията.");
  }

  const { error } = await supabase
    .from("product_promotions")
    .update({
      product_id: payload.productId,
      name: payload.name,
      discount_type: payload.discountType,
      discount_value: payload.discountValue,
      starts_at: payload.startsAt,
      ends_at: payload.endsAt,
      is_active: payload.isActive,
    })
    .eq("id", id);

  done(error ? "error" : "success", error ? mapPromotionError(error) : "Промоцията е обновена.");
}

export async function deleteProductPromotion(formData: FormData) {
  const supabase = await getAuthorizedClient();
  const id = getString(formData, adminFormFields.promotion.id);

  if (!id) {
    done("error", "Липсва идентификатор на промоцията.");
  }

  const { error } = await supabase.from("product_promotions").delete().eq("id", id);
  done(error ? "error" : "success", error ? "Промоцията не беше изтрита." : "Промоцията е изтрита.");
}
