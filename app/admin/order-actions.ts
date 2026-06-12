"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  buildOrdersListHref,
  isOrderStatus,
  parseOrdersQuery,
} from "@/lib/admin/orders";
import { checkIsAdmin } from "@/lib/supabase/admin-auth";
import { createClient } from "@/lib/supabase/server";

function redirectToOrders(
  kind: "success" | "error",
  message: string,
  query: ReturnType<typeof parseOrdersQuery>,
): never {
  const params = new URLSearchParams(buildOrdersListHref(query).split("?")[1] ?? "");
  params.set(kind, message);
  redirect(`/admin?${params.toString()}`);
}

function parseReturnQuery(formData: FormData) {
  return parseOrdersQuery({
    status: String(formData.get("return_status") ?? ""),
    search: String(formData.get("return_q") ?? ""),
    source: String(formData.get("return_source") ?? ""),
    dateFrom: String(formData.get("return_date_from") ?? ""),
    dateTo: String(formData.get("return_date_to") ?? ""),
    payment: String(formData.get("return_payment") ?? ""),
    delivery: String(formData.get("return_delivery") ?? ""),
    sort: String(formData.get("return_sort") ?? ""),
    page: String(formData.get("return_page") ?? ""),
    pageSize: String(formData.get("return_page_size") ?? ""),
  });
}

export async function updateOrderStatus(formData: FormData) {
  const id = String(formData.get("id") ?? "").trim();
  const status = String(formData.get("status") ?? "").trim();
  const query = parseReturnQuery(formData);

  if (!id || !isOrderStatus(status)) {
    redirectToOrders("error", "Невалидни данни за поръчката.", query);
  }

  const supabase = await createClient();
  if (!supabase) {
    redirectToOrders("error", "Supabase не е конфигуриран.", query);
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
    redirectToOrders("error", "Статусът не беше променен.", query);
  }

  revalidatePath("/admin");
  redirectToOrders("success", "Статусът на поръчката е обновен.", query);
}
