"use server";

import { revalidatePath } from "next/cache";

import { WITHDRAWAL_SUCCESS_MESSAGE } from "@/lib/withdrawal/constants";
import { createWithdrawalRequest } from "@/lib/withdrawal/create-request";
import { checkWithdrawalRateLimit } from "@/lib/withdrawal/withdrawal-rate-limit";
import { resolveWithdrawalOrderId } from "@/lib/withdrawal/match-order";
import {
  validateWithdrawalForm,
  type WithdrawalFormInput,
} from "@/lib/withdrawal/validation";
import { getRequestFingerprint } from "@/lib/request-fingerprint";
import { createServiceClient } from "@/lib/supabase/service";

export type WithdrawalActionState = {
  ok: boolean;
  message: string;
  fieldErrors?: import("@/lib/withdrawal/validation").WithdrawalFieldErrors;
};

const initialMessage = "";

export const withdrawalInitialState: WithdrawalActionState = {
  ok: false,
  message: initialMessage,
};

function text(formData: FormData, name: string, maxLength: number) {
  return String(formData.get(name) ?? "").trim().slice(0, maxLength);
}

export async function submitWithdrawalRequest(
  _previousState: WithdrawalActionState,
  formData: FormData,
): Promise<WithdrawalActionState> {
  const validation = validateWithdrawalForm({
    orderNumber: text(formData, "order_number", 32),
    customerName: text(formData, "customer_name", 120),
    contactEmail: text(formData, "contact_email", 160),
    contactPhone: text(formData, "contact_phone", 30),
    receivedAt: text(formData, "received_at", 10),
    itemsDescription: text(formData, "items_description", 2000),
    note: text(formData, "note", 1000),
    statementConfirmed: formData.get("statement_confirmed") === "on",
    confirmationChecked: formData.get("confirmation_checked") === "on",
    idempotencyKey: text(formData, "idempotency_key", 36),
    honeypot: text(formData, "website", 200),
  } satisfies WithdrawalFormInput);

  if (!validation.ok) {
    return {
      ok: false,
      message: validation.message,
      fieldErrors: validation.fieldErrors,
    };
  }

  const supabase = createServiceClient();
  const clientKey = await getRequestFingerprint("contract-withdrawal");
  if (!supabase) {
    return {
      ok: false,
      message:
        "Формата временно не е достъпна. Моля, опитайте по-късно или се свържете с нас.",
    };
  }

  const rateLimitDecision = await checkWithdrawalRateLimit(supabase, clientKey);
  if (rateLimitDecision.kind === "deny") {
    return {
      ok: false,
      message: "Направени са твърде много опити. Изчакайте 15 минути и опитайте отново.",
    };
  }

  let orderId: string | null = null;
  try {
    orderId = await resolveWithdrawalOrderId(supabase, {
      orderNumber: validation.value.orderNumber,
      contactEmail: validation.value.contactEmail,
      contactPhone: validation.value.contactPhone,
    });
  } catch (matchError) {
    console.error("Withdrawal order match failed", {
      error: matchError instanceof Error ? matchError.message : "unknown",
    });
  }

  try {
    await createWithdrawalRequest(supabase, {
      ...validation.value,
      orderId,
    });
  } catch (error) {
    console.error("Withdrawal request create failed", {
      error: error instanceof Error ? error.message : "unknown",
    });
    return {
      ok: false,
      message:
        "Заявлението не беше прието. Моля, опитайте отново или се свържете с нас.",
    };
  }

  revalidatePath("/admin");

  return {
    ok: true,
    message: WITHDRAWAL_SUCCESS_MESSAGE,
  };
}
