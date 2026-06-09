"use server";

import { createClient } from "@/lib/supabase/server";

export type NewsletterState = {
  status: "idle" | "success" | "error";
  message: string;
};

export async function subscribeToNewsletter(
  _previousState: NewsletterState,
  formData: FormData,
): Promise<NewsletterState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { status: "error", message: "Въведете валиден имейл адрес." };
  }

  const supabase = await createClient();
  if (!supabase) {
    return { status: "error", message: "Абонаментът временно не е достъпен." };
  }

  const { error } = await supabase.rpc("subscribe_newsletter", { p_email: email });
  if (error) {
    return { status: "error", message: "Не успяхме да запишем абонамента. Опитайте отново." };
  }

  return { status: "success", message: "Готово. Ще получавате новите статии по имейл." };
}
