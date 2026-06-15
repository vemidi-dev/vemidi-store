"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  buildWithdrawalsListHref,
  parseWithdrawalsQuery,
} from "@/lib/admin/withdrawals";
import { isWithdrawalStatus } from "@/lib/withdrawal/validation";
import { checkIsAdmin } from "@/lib/supabase/admin-auth";
import { createClient } from "@/lib/supabase/server";

function redirectToWithdrawals(
  kind: "success" | "error",
  message: string,
  query: ReturnType<typeof parseWithdrawalsQuery>,
): never {
  const params = new URLSearchParams(buildWithdrawalsListHref(query).split("?")[1] ?? "");
  params.set(kind, message);
  redirect(`/admin?${params.toString()}`);
}

function parseReturnQuery(formData: FormData) {
  return parseWithdrawalsQuery({
    status: String(formData.get("return_status") ?? ""),
    search: String(formData.get("return_q") ?? ""),
    page: String(formData.get("return_page") ?? ""),
    pageSize: String(formData.get("return_page_size") ?? ""),
  });
}

export async function updateWithdrawalStatus(formData: FormData) {
  const id = String(formData.get("id") ?? "").trim();
  const status = String(formData.get("status") ?? "").trim();
  const query = parseReturnQuery(formData);

  if (!id || !isWithdrawalStatus(status)) {
    redirectToWithdrawals("error", "Невалидни данни за заявлението.", query);
  }

  const supabase = await createClient();
  if (!supabase) {
    redirectToWithdrawals("error", "Supabase не е конфигуриран.", query);
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

  const { error } = await supabase
    .from("contract_withdrawal_requests")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) {
    redirectToWithdrawals("error", "Статусът не беше променен.", query);
  }

  revalidatePath("/admin");
  redirectToWithdrawals("success", "Статусът на заявлението е обновен.", query);
}
