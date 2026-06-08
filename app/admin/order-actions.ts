"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { isOrderStatus } from "@/lib/admin/orders";
import { checkIsAdmin } from "@/lib/supabase/admin-auth";
import { createClient } from "@/lib/supabase/server";

function redirectToOrders(kind: "success" | "error", message: string): never {
  const params = new URLSearchParams({ tab: "orders", [kind]: message });
  redirect(`/admin?${params.toString()}`);
}

export async function updateOrderStatus(formData: FormData) {
  const id = String(formData.get("id") ?? "").trim();
  const status = String(formData.get("status") ?? "").trim();

  if (!id || !isOrderStatus(status)) {
    redirectToOrders("error", "Невалидни данни за поръчката.");
  }

  const supabase = await createClient();
  if (!supabase) {
    redirectToOrders("error", "Supabase не е конфигуриран.");
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/admin/login?message=Моля, влезте като администратор.");
  }

  const { isAdmin, error: adminError } = await checkIsAdmin(supabase, user.id);
  if (adminError || !isAdmin) {
    redirect("/admin/login?message=Профилът няма администраторски права.");
  }

  const { error } = await supabase.from("orders").update({ status }).eq("id", id);
  if (error) {
    redirectToOrders("error", `Статусът не беше променен: ${error.message}`);
  }

  revalidatePath("/admin");
  redirectToOrders("success", "Статусът на поръчката е обновен.");
}
