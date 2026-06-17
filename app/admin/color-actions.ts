"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getString } from "@/lib/admin/form-data";
import { adminFormFields } from "@/lib/admin/form-fields";
import { checkIsAdmin } from "@/lib/supabase/admin-auth";
import { createClient } from "@/lib/supabase/server";

function done(kind: "success" | "error", message: string): never {
  revalidatePath("/admin");
  revalidatePath("/producti");
  revalidatePath("/products/[slug]", "page");
  revalidatePath("/produkti/[slug]", "page");
  redirect(`/admin?tab=colors&${kind}=${encodeURIComponent(message)}`);
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

function normalizeHex(value: string) {
  const normalized = value.trim().toUpperCase();
  return /^#[0-9A-F]{6}$/.test(normalized) ? normalized : null;
}

export async function createColorGroup(formData: FormData) {
  const supabase = await getAuthorizedClient();
  const label = getString(formData, adminFormFields.colorPalette.label);
  if (!label) {
    done("error", "Въведете име на палитрата.");
  }

  const key = `palette_${randomUUID().replaceAll("-", "").slice(0, 16)}`;
  const { error } = await supabase.from("color_groups").insert({ key, label });
  done(
    error ? "error" : "success",
    error ? "Палитрата не беше добавена." : "Палитрата е добавена.",
  );
}

export async function updateColorGroup(formData: FormData) {
  const supabase = await getAuthorizedClient();
  const id = getString(formData, adminFormFields.colorPalette.groupId);
  const label = getString(formData, adminFormFields.colorPalette.label);
  if (!id || !label) {
    done("error", "Невалидни данни за палитрата.");
  }

  const { error } = await supabase
    .from("color_groups")
    .update({ label })
    .eq("id", id);
  done(
    error ? "error" : "success",
    error ? "Палитрата не беше обновена." : "Палитрата е обновена.",
  );
}

export async function deleteColorGroup(formData: FormData) {
  const supabase = await getAuthorizedClient();
  const id = getString(formData, adminFormFields.colorPalette.groupId);
  if (!id) {
    done("error", "Липсва палитра за изтриване.");
  }

  const { count } = await supabase
    .from("product_color_fields")
    .select("id", { count: "exact", head: true })
    .eq("group_id", id);
  if ((count ?? 0) > 0) {
    done(
      "error",
      "Палитрата се използва от продукт. Премахнете я от продуктите преди изтриване.",
    );
  }

  const { error } = await supabase.from("color_groups").delete().eq("id", id);
  done(
    error ? "error" : "success",
    error ? "Палитрата не беше изтрита." : "Палитрата е изтрита.",
  );
}

export async function createColorOption(formData: FormData) {
  const supabase = await getAuthorizedClient();
  const groupId = getString(formData, adminFormFields.colorPalette.groupId);
  const name = getString(formData, adminFormFields.colorPalette.name);
  const hex = normalizeHex(
    getString(formData, adminFormFields.colorPalette.hex),
  );
  if (!groupId || !name || !hex) {
    done("error", "Въведете име и валиден цвят.");
  }

  const { data: lastOption } = await supabase
    .from("color_options")
    .select("sort_order")
    .eq("group_id", groupId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  const sortOrder = (Number(lastOption?.sort_order) || 0) + 10;

  const { error } = await supabase.from("color_options").insert({
    group_id: groupId,
    name,
    hex,
    sort_order: sortOrder,
    is_active: true,
  });
  done(
    error ? "error" : "success",
    error ? "Цветът не беше добавен." : "Цветът е добавен.",
  );
}

export async function updateColorOption(formData: FormData) {
  const supabase = await getAuthorizedClient();
  const id = getString(formData, adminFormFields.colorPalette.optionId);
  const name = getString(formData, adminFormFields.colorPalette.name);
  const hex = normalizeHex(
    getString(formData, adminFormFields.colorPalette.hex),
  );
  if (!id || !name || !hex) {
    done("error", "Въведете име и валиден цвят.");
  }

  const isActive = formData.get("is_active") === "on";
  if (!isActive) {
    const { count } = await supabase
      .from("product_color_field_options")
      .select("id", { count: "exact", head: true })
      .eq("color_option_id", id);
    if ((count ?? 0) > 0) {
      done(
        "error",
        "Цветът се използва от продукт. Премахнете го от продуктите преди скриване.",
      );
    }
  }

  const { error } = await supabase
    .from("color_options")
    .update({
      name,
      hex,
      is_active: isActive,
    })
    .eq("id", id);
  done(
    error ? "error" : "success",
    error ? "Цветът не беше обновен." : "Цветът е обновен.",
  );
}

export async function moveColorOption(formData: FormData) {
  const supabase = await getAuthorizedClient();
  const id = getString(formData, adminFormFields.colorPalette.optionId);
  const direction = getString(
    formData,
    adminFormFields.colorPalette.direction,
  );
  if (!id || !["up", "down"].includes(direction)) {
    done("error", "Невалидна заявка за преместване.");
  }

  const { data, error } = await supabase.rpc("admin_move_color_option", {
    p_option_id: id,
    p_direction: direction,
  });
  if (error) {
    done("error", "Цветът не беше преместен.");
  }
  done(
    "success",
    data === true ? "Редът на цветовете е променен." : "Цветът вече е в края.",
  );
}
