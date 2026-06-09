"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { isOrderStatus } from "@/lib/admin/orders";
import { checkIsAdmin } from "@/lib/supabase/admin-auth";
import { createClient } from "@/lib/supabase/server";

function redirectToOrders(
  kind: "success" | "error",
  message: string,
  filters?: { status?: string; source?: string; search?: string },
): never {
  const params = new URLSearchParams({ tab: "orders", [kind]: message });
  if (filters?.status) params.set("status", filters.status);
  if (filters?.source) params.set("source", filters.source);
  if (filters?.search) params.set("q", filters.search);
  redirect(`/admin?${params.toString()}`);
}

export async function updateOrderStatus(formData: FormData) {
  const id = String(formData.get("id") ?? "").trim();
  const status = String(formData.get("status") ?? "").trim();
  const filters = {
    status: String(formData.get("return_status") ?? "").trim(),
    source: String(formData.get("return_source") ?? "").trim(),
    search: String(formData.get("return_q") ?? "").trim(),
  };

  if (!id || !isOrderStatus(status)) {
    redirectToOrders("error", "Невалидни данни за поръчката.", filters);
  }

  const supabase = await createClient();
  if (!supabase) {
    redirectToOrders("error", "Supabase не е конфигуриран.", filters);
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
    redirectToOrders("error", `Статусът не беше променен: ${error.message}`, filters);
  }

  revalidatePath("/admin");
  redirectToOrders("success", "Статусът на поръчката е обновен.", filters);
}
