import { NextResponse } from "next/server";

import type { OrderRow } from "@/lib/admin/orders";
import { getCronAuthFailureStatus } from "@/lib/cron/cron-auth";
import { retryPendingOrderNotifications } from "@/lib/orders/order-notification-outbox";
import { createServiceClient } from "@/lib/supabase/service";

const CRON_BATCH_LIMIT = 25;

export async function GET(request: Request) {
  if (getCronAuthFailureStatus(request) === 401) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();
  if (!supabase) {
    return NextResponse.json(
      { error: "Supabase service client is not configured." },
      { status: 503 },
    );
  }

  try {
    const results = await retryPendingOrderNotifications(supabase, {
      limit: CRON_BATCH_LIMIT,
      loadOrder: async (orderId) => {
        const { data, error } = await supabase
          .from("orders")
          .select(
            "id,created_at,status,product_name,kit_name,kit_size,coloring,personalization,child_name,total_price,currency,customer_name,customer_phone,customer_email,courier,delivery_type,city,delivery_details,office_id,office_name,office_address,payment_method,note,raw_payload",
          )
          .eq("id", orderId)
          .maybeSingle();

        if (error) {
          throw error;
        }

        return (data as OrderRow | null) ?? null;
      },
    });

    return NextResponse.json({
      ok: true,
      processed: results.length,
      results: results.map((entry) => ({
        orderId: entry.orderId,
        channel: entry.channel,
        sent: entry.outcome?.sent ?? false,
        skipped: entry.outcome?.skipped ?? false,
        error: entry.outcome?.error ?? null,
      })),
    });
  } catch (error) {
    console.error("Order notification retry cron failed", {
      error: error instanceof Error ? error.message : "unknown",
    });
    return NextResponse.json({ error: "Retry job failed." }, { status: 500 });
  }
}
