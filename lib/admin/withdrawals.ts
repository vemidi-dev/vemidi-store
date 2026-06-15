import type { SupabaseClient } from "@supabase/supabase-js";

import {
  WITHDRAWAL_STATUSES,
  withdrawalStatusLabels,
  type WithdrawalStatus,
} from "@/lib/withdrawal/constants";
import type { WithdrawalRequestRow } from "@/lib/withdrawal/withdrawal-email";
import { isWithdrawalStatus } from "@/lib/withdrawal/validation";

export { WITHDRAWAL_STATUSES, withdrawalStatusLabels, isWithdrawalStatus };
export type { WithdrawalRequestRow, WithdrawalStatus };

export type WithdrawalsQuery = {
  status: WithdrawalStatus | "";
  search: string;
  page: number;
  pageSize: number;
};

export const WITHDRAWAL_PAGE_SIZE_DEFAULT = 25;
export const WITHDRAWAL_PAGE_SIZE_MAX = 100;

export function parseWithdrawalsQuery(
  params: Record<string, string | undefined>,
): WithdrawalsQuery {
  const page = Math.max(1, Number.parseInt(params.page ?? "1", 10) || 1);
  const pageSize = Math.min(
    WITHDRAWAL_PAGE_SIZE_MAX,
    Math.max(
      1,
      Number.parseInt(params.pageSize ?? String(WITHDRAWAL_PAGE_SIZE_DEFAULT), 10) ||
        WITHDRAWAL_PAGE_SIZE_DEFAULT,
    ),
  );
  const status = params.status?.trim() ?? "";
  const search = params.search?.trim().slice(0, 120) ?? "";

  return {
    status: isWithdrawalStatus(status) ? status : "",
    search,
    page,
    pageSize,
  };
}

export function formatWithdrawalDate(value: string | null) {
  if (!value) {
    return "—";
  }

  return new Intl.DateTimeFormat("bg-BG", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function getWithdrawalClientLabel(request: WithdrawalRequestRow) {
  return request.customer_name?.trim() || "—";
}

export function buildWithdrawalsListHref(query: WithdrawalsQuery) {
  const params = new URLSearchParams();
  params.set("tab", "withdrawals");
  if (query.status) params.set("status", query.status);
  if (query.search) params.set("q", query.search);
  if (query.page > 1) params.set("page", String(query.page));
  if (query.pageSize !== WITHDRAWAL_PAGE_SIZE_DEFAULT) {
    params.set("pageSize", String(query.pageSize));
  }
  return `/admin?${params.toString()}`;
}

export async function loadWithdrawalsPage(
  supabase: SupabaseClient,
  query: WithdrawalsQuery,
) {
  const offset = (query.page - 1) * query.pageSize;
  let request = supabase
    .from("contract_withdrawal_requests")
    .select("*", { count: "exact" });

  if (query.status) {
    request = request.eq("status", query.status);
  }

  if (query.search) {
    const pattern = `%${query.search}%`;
    request = request.or(
      `reference_number.ilike.${pattern},customer_name.ilike.${pattern},order_number_submitted.ilike.${pattern},contact_email.ilike.${pattern},contact_phone.ilike.${pattern}`,
    );
  }

  const { data, error, count } = await request
    .order("created_at", { ascending: false })
    .range(offset, offset + query.pageSize - 1);

  return {
    requests: (data ?? []) as WithdrawalRequestRow[],
    total: count ?? 0,
    page: query.page,
    pageSize: query.pageSize,
    error: error ? { message: error.message } : null,
  };
}
