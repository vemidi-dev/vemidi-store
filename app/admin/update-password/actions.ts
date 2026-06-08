"use server";

import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

export async function updateAdminPassword(formData: FormData) {
  const password = String(formData.get("password") ?? "");
  const confirmation = String(formData.get("confirmation") ?? "");

  if (password.length < 8) {
    redirect("/admin/update-password?error=Паролата трябва да е поне 8 знака.");
  }
  if (password !== confirmation) {
    redirect("/admin/update-password?error=Двете пароли не съвпадат.");
  }

  const supabase = await createClient();
  if (!supabase) {
    redirect("/admin/update-password?error=Supabase не е конфигуриран.");
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/admin/reset-password?error=Линкът е изтекъл. Поискайте нов.");
  }

  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    redirect(`/admin/update-password?error=${encodeURIComponent(error.message)}`);
  }

  redirect("/admin?success=Паролата е променена успешно.");
}
