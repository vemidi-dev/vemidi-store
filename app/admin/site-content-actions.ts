"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { checkIsAdmin } from "@/lib/supabase/admin-auth";
import { createClient } from "@/lib/supabase/server";

const ADMIN_PATH = "/admin?tab=content";

function redirectWith(kind: "success" | "error", message: string): never {
  redirect(`${ADMIN_PATH}&${kind}=${encodeURIComponent(message)}`);
}

export async function updateSiteContent(formData: FormData) {
  const supabase = await createClient();
  if (!supabase) {
    redirectWith("error", "Supabase не е конфигуриран.");
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

  const { data: fields, error: fieldsError } = await supabase
    .from("site_content")
    .select("key,label,section,sort_order,is_multiline");

  if (fieldsError) {
    redirectWith(
      "error",
      "Липсва миграцията site_content_settings.sql в Supabase.",
    );
  }

  const updates = (fields ?? []).map((field) => ({
    key: String(field.key),
    value: String(formData.get(`content:${field.key}`) ?? "")
      .trim()
      .slice(0, 5000),
    label: String(field.label),
    section: String(field.section),
    sort_order: Number(field.sort_order) || 0,
    is_multiline: Boolean(field.is_multiline),
    updated_at: new Date().toISOString(),
  }));

  if (!updates.length) {
    redirectWith("error", "Няма налични полета за редакция.");
  }

  const { error } = await supabase
    .from("site_content")
    .upsert(updates, { onConflict: "key" });

  if (error) {
    redirectWith("error", `Текстовете не бяха запазени: ${error.message}`);
  }

  revalidatePath("/");
  revalidatePath("/za-nas");
  revalidatePath("/cart");
  revalidatePath("/checkout");
  revalidatePath("/kontakti");
  revalidatePath("/producti");
  revalidatePath("/categorii");
  revalidatePath("/categorii");
  revalidatePath("/povodi");
  revalidatePath("/povodi");
  revalidatePath("/delivery");
  revalidatePath("/returns");
  revalidatePath("/terms");
  revalidatePath("/privacy");
  revalidatePath("/cookies");
  revalidatePath("/admin");
  redirectWith("success", "Текстовете и контактните данни са обновени.");
}
