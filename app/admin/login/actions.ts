"use server";

import { redirect } from "next/navigation";

import { checkIsAdmin } from "@/lib/supabase/admin-auth";
import { createClient } from "@/lib/supabase/server";

const LOGIN_PATH = "/admin/login";
const ADMIN_PATH = "/admin";

function getField(formData: FormData, key: "email" | "password") {
  return String(formData.get(key) ?? "").trim();
}

function toLoginWithMessage(message: string): never {
  redirect(`${LOGIN_PATH}?message=${encodeURIComponent(message)}`);
}

export async function adminLogin(formData: FormData) {
  const email = getField(formData, "email");
  const password = getField(formData, "password");

  if (!email || !password) {
    toLoginWithMessage("Моля, попълнете имейл и парола.");
  }

  const supabase = await createClient();
  if (!supabase) {
    toLoginWithMessage("Supabase не е конфигуриран.");
  }

  const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
  if (signInError) {
    toLoginWithMessage(`Грешка при вход: ${signInError.message}`);
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    toLoginWithMessage("Неуспешен вход. Опитайте отново.");
  }

  const { isAdmin, error: adminError } = await checkIsAdmin(supabase, user.id);
  if (adminError) {
    await supabase.auth.signOut();
    toLoginWithMessage(
      "Липсва admin_users таблица или достъп. Изпълнете SQL скрипта за админи в Supabase.",
    );
  }

  if (!isAdmin) {
    await supabase.auth.signOut();
    toLoginWithMessage("Този профил не е администратор.");
  }

  redirect(ADMIN_PATH);
}

export async function adminLogout() {
  const supabase = await createClient();
  if (supabase) {
    await supabase.auth.signOut();
  }
  redirect(LOGIN_PATH);
}
