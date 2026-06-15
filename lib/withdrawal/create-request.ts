import type { SupabaseClient } from "@supabase/supabase-js";

import { isWithdrawalNotificationOutboxUnavailable } from "@/lib/withdrawal/outbox-errors";
import {
  resolveWithdrawalRequestInsert,
  type CreateWithdrawalRequestInput,
} from "@/lib/withdrawal/request-store";
import type { WithdrawalRequestRow } from "@/lib/withdrawal/withdrawal-email";
import { enqueueAndDispatchWithdrawalNotifications } from "@/lib/withdrawal/withdrawal-notification-outbox";

export type { CreateWithdrawalRequestInput };

export async function createWithdrawalRequest(
  supabase: SupabaseClient,
  input: CreateWithdrawalRequestInput,
): Promise<WithdrawalRequestRow> {
  const { request, created } = await resolveWithdrawalRequestInsert(supabase, input);

  if (!created) {
    return request;
  }

  try {
    await enqueueAndDispatchWithdrawalNotifications(supabase, request);
  } catch (notificationError) {
    if (!isWithdrawalNotificationOutboxUnavailable(notificationError)) {
      console.error("Withdrawal notification dispatch failed", {
        referenceNumber: request.reference_number,
        error:
          notificationError instanceof Error
            ? notificationError.message
            : "unknown",
      });
    }
  }

  return request;
}
