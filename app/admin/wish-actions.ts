"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { checkIsAdmin } from "@/lib/supabase/admin-auth";
import { createClient } from "@/lib/supabase/server";

async function client() {
  const supabase = await createClient();
  if (!supabase) redirect("/admin/login");
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/admin/login");
  const { isAdmin } = await checkIsAdmin(supabase, user.id);
  if (!isAdmin) redirect("/admin/login");
  return supabase;
}

function done(kind: "success" | "error", message: string): never {
  revalidatePath("/admin");
  revalidatePath("/products/[slug]", "page");
  redirect(`/admin?tab=wishes&${kind}=${encodeURIComponent(message)}`);
}

export async function createWishTemplate(formData: FormData) {
  const supabase = await client();
  const title = String(formData.get("title") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  const categoryIds = formData.getAll("category_ids").map(String).filter(Boolean);
  if (!title || !body || !categoryIds.length) done("error", "Попълнете заглавие, текст и поне един повод.");
  const { data, error } = await supabase
    .from("wish_templates")
    .insert({ title, body, is_active: true })
    .select("id")
    .single();
  if (error || !data) done("error", "Пожеланието не беше добавено.");
  const { error: linkError } = await supabase.from("wish_template_occasions").insert(
    categoryIds.map((category_id) => ({ wish_template_id: data.id, category_id })),
  );
  if (linkError) {
    await supabase.from("wish_templates").delete().eq("id", data.id);
    done("error", "Поводите не бяха свързани.");
  }
  done("success", "Пожеланието е добавено.");
}

export async function deleteWishTemplate(formData: FormData) {
  const supabase = await client();
  const id = String(formData.get("id") ?? "");
  const { error } = await supabase.from("wish_templates").delete().eq("id", id);
  done(error ? "error" : "success", error ? "Пожеланието не беше изтрито." : "Пожеланието е изтрито.");
}

export async function createPersonalizationField(formData: FormData) {
  const supabase = await client();
  const productId = String(formData.get("product_id") ?? "");
  const label = String(formData.get("label") ?? "").trim();
  const key = String(formData.get("field_key") ?? "").trim().toLowerCase().replace(/[^a-z0-9]+/g, "_");
  const type = String(formData.get("field_type") ?? "text");
  const maxLength = Math.min(1000, Math.max(1, Number(formData.get("max_length")) || 100));
  if (!productId || !label || !key) done("error", "Попълнете продукт, име и ключ на полето.");
  const { error } = await supabase.from("product_personalization_fields").insert({
    product_id: productId,
    label,
    field_key: key,
    field_type: type,
    placeholder: String(formData.get("placeholder") ?? "").trim() || null,
    max_length: maxLength,
    is_required: formData.get("is_required") === "on",
    allows_wish_templates: formData.get("allows_wish_templates") === "on",
  });
  done(error ? "error" : "success", error ? `Полето не беше добавено: ${error.message}` : "Полето е добавено.");
}

export async function deletePersonalizationField(formData: FormData) {
  const supabase = await client();
  const id = String(formData.get("id") ?? "");
  const { error } = await supabase.from("product_personalization_fields").delete().eq("id", id);
  done(error ? "error" : "success", error ? "Полето не беше изтрито." : "Полето е изтрито.");
}
