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

export async function createPromotionCampaign(formData: FormData) {
  const supabase = await getAuthorizedClient();
  const name = getString(formData, adminFormFields.promotion.name);
  const discountValue = parseDiscountValue(
    getString(formData, adminFormFields.promotion.discountValue),
    "percentage",
  );
  const startsAt = parseDateTime(
    getString(formData, adminFormFields.promotion.startsAt),
  );
  const endsAt = parseDateTime(
    getString(formData, adminFormFields.promotion.endsAt),
  );
  const isActive =
    formData.get(adminFormFields.promotion.isActive) === "on";
  const productIds = Array.from(
    new Set(
      formData
        .getAll(adminFormFields.promotion.productIds)
        .map((value) => String(value ?? "").trim())
        .filter(Boolean),
    ),
  );

  if (
    !name ||
    discountValue == null ||
    !startsAt ||
    !endsAt ||
    new Date(endsAt).getTime() <= new Date(startsAt).getTime() ||
    productIds.length === 0
  ) {
    done("error", "Попълнете коректно кампанията и изберете поне един продукт.");
  }

  const { error } = await supabase.rpc("admin_create_promotion_campaign", {
    p_name: name,
    p_discount_percentage: discountValue,
    p_starts_at: startsAt,
    p_ends_at: endsAt,
    p_is_active: isActive,
    p_product_ids: productIds,
  });

  if (error) {
    const migrationMissing = error.message.includes(
      "admin_create_promotion_campaign",
    );
    done(
      "error",
      migrationMissing
        ? "Липсва миграцията promotion_campaigns.sql в Supabase."
        : mapPromotionError(error),
    );
  }

  done(
    "success",
    `Кампанията е създадена за ${productIds.length} продукта.`,
  );
}

export async function setPromotionCampaignActive(formData: FormData) {
  const supabase = await getAuthorizedClient();
  const campaignId = getString(
    formData,
    adminFormFields.promotion.campaignId,
  );
  const isActive =
    formData.get(adminFormFields.promotion.isActive) === "true";

  if (!campaignId) {
    done("error", "Липсва кампания за обновяване.");
  }

  const { error } = await supabase.rpc(
    "admin_set_promotion_campaign_active",
    {
      p_campaign_id: campaignId,
      p_is_active: isActive,
    },
  );

  done(
    error ? "error" : "success",
    error
      ? mapPromotionError(error)
      : isActive
        ? "Кампанията е активирана."
        : "Кампанията е спряна.",
  );
}

export async function updatePromotionCampaign(formData: FormData) {
  const supabase = await getAuthorizedClient();
  const campaignId = getString(formData, adminFormFields.promotion.campaignId);
  const name = getString(formData, adminFormFields.promotion.name);
  const discountValue = parseDiscountValue(
    getString(formData, adminFormFields.promotion.discountValue),
    "percentage",
  );
  const startsAt = parseDateTime(getString(formData, adminFormFields.promotion.startsAt));
  const endsAt = parseDateTime(getString(formData, adminFormFields.promotion.endsAt));
  const isActive = formData.get(adminFormFields.promotion.isActive) === "on";

  if (
    !campaignId ||
    !name ||
    discountValue == null ||
    !startsAt ||
    !endsAt ||
    new Date(endsAt).getTime() <= new Date(startsAt).getTime()
  ) {
    done("error", "Попълнете коректно данните на кампанията.");
  }

  const { error: campaignError } = await supabase
    .from("promotion_campaigns")
    .update({
      name,
      discount_percentage: discountValue,
      starts_at: startsAt,
      ends_at: endsAt,
      is_active: isActive,
      updated_at: new Date().toISOString(),
    })
    .eq("id", campaignId);

  if (campaignError) {
    done("error", "Кампанията не беше обновена.");
  }

  const { error: promotionsError } = await supabase
    .from("product_promotions")
    .update({
      name,
      discount_type: "percentage",
      discount_value: discountValue,
      starts_at: startsAt,
      ends_at: endsAt,
      is_active: isActive,
    })
    .eq("campaign_id", campaignId);

  done(
    promotionsError ? "error" : "success",
    promotionsError ? mapPromotionError(promotionsError) : "Кампанията е обновена.",
  );
}

export async function duplicatePromotionCampaign(formData: FormData) {
  const supabase = await getAuthorizedClient();
  const campaignId = getString(formData, adminFormFields.promotion.campaignId);

  if (!campaignId) {
    done("error", "Липсва кампания за дублиране.");
  }

  const { data: campaign, error: campaignError } = await supabase
    .from("promotion_campaigns")
    .select("name,discount_percentage,starts_at,ends_at,is_active")
    .eq("id", campaignId)
    .maybeSingle();

  if (campaignError || !campaign) {
    done("error", "Кампанията не беше намерена.");
  }

  const { data: promotionRows, error: promotionsError } = await supabase
    .from("product_promotions")
    .select("product_id")
    .eq("campaign_id", campaignId);

  if (promotionsError) {
    done("error", "Продуктите на кампанията не бяха заредени.");
  }

  const productIds = Array.from(
    new Set((promotionRows ?? []).map((row) => String(row.product_id)).filter(Boolean)),
  );

  if (productIds.length === 0) {
    done("error", "Кампанията няма продукти за копиране.");
  }

  const { error } = await supabase.rpc("admin_create_promotion_campaign", {
    p_name: `${campaign.name} (копие)`,
    p_discount_percentage: Number(campaign.discount_percentage),
    p_starts_at: campaign.starts_at,
    p_ends_at: campaign.ends_at,
    p_is_active: false,
    p_product_ids: productIds,
  });

  done(
    error ? "error" : "success",
    error ? mapPromotionError(error) : "Кампанията е дублирана като неактивна чернова.",
  );
}

export async function deletePromotionCampaign(formData: FormData) {
  const supabase = await getAuthorizedClient();
  const campaignId = getString(
    formData,
    adminFormFields.promotion.campaignId,
  );

  if (!campaignId) {
    done("error", "Липсва кампания за изтриване.");
  }

  const { error } = await supabase
    .from("promotion_campaigns")
    .delete()
    .eq("id", campaignId);

  done(
    error ? "error" : "success",
    error ? "Кампанията не беше изтрита." : "Кампанията е изтрита.",
  );
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
