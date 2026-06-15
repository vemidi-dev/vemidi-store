import type { SupabaseClient } from "@supabase/supabase-js";

import { buildWithdrawalReferenceNumber } from "@/lib/withdrawal/reference";
import type { WithdrawalRequestRow } from "@/lib/withdrawal/withdrawal-email";

const REQUEST_TABLE = "contract_withdrawal_requests";

export type CreateWithdrawalRequestInput = {
  orderNumber: string;
  customerName: string;
  contactEmail: string | null;
  contactPhone: string | null;
  receivedAt: string;
  itemsDescription: string;
  note: string | null;
  idempotencyKey: string;
  orderId: string | null;
};

export async function loadWithdrawalRequestByIdempotencyKey(
  supabase: SupabaseClient,
  idempotencyKey: string,
) {
  const { data, error } = await supabase
    .from(REQUEST_TABLE)
    .select("*")
    .eq("idempotency_key", idempotencyKey)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return (data as WithdrawalRequestRow | null) ?? null;
}

export async function insertWithdrawalRequest(
  supabase: SupabaseClient,
  input: CreateWithdrawalRequestInput,
): Promise<WithdrawalRequestRow> {
  const referenceNumber = buildWithdrawalReferenceNumber();
  const { data, error } = await supabase
    .from(REQUEST_TABLE)
    .insert({
      reference_number: referenceNumber,
      idempotency_key: input.idempotencyKey,
      order_id: input.orderId,
      order_number_submitted: input.orderNumber,
      contact_email: input.contactEmail,
      contact_phone: input.contactPhone,
      customer_name: input.customerName,
      received_at: input.receivedAt,
      items_description: input.itemsDescription,
      statement_confirmed: true,
      note: input.note,
      status: "new",
    })
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return data as WithdrawalRequestRow;
}

export async function resolveWithdrawalRequestInsert(
  supabase: SupabaseClient,
  input: CreateWithdrawalRequestInput,
): Promise<{ request: WithdrawalRequestRow; created: boolean }> {
  const existing = await loadWithdrawalRequestByIdempotencyKey(
    supabase,
    input.idempotencyKey,
  );
  if (existing) {
    return { request: existing, created: false };
  }

  try {
    const request = await insertWithdrawalRequest(supabase, input);
    return { request, created: true };
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      String((error as { code?: string }).code) === "23505"
    ) {
      const duplicate = await loadWithdrawalRequestByIdempotencyKey(
        supabase,
        input.idempotencyKey,
      );
      if (duplicate) {
        return { request: duplicate, created: false };
      }
    }

    throw error;
  }
}
