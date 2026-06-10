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
  const body = String(formData.get("body") ?? "").trim();
  const categoryIds = formData.getAll("category_ids").map(String).filter(Boolean);
  if (!body || !categoryIds.length) {
    done("error", "Попълнете текста и изберете поне един повод.");
  }
  const title = body.replace(/\s+/g, " ").slice(0, 80);
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
