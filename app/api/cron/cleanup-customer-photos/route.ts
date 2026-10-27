import { NextResponse } from "next/server";
import { getCronAuthFailureStatus } from "@/lib/cron/cron-auth";
import { createServiceClient } from "@/lib/supabase/service";
import { cleanupAbandonedCustomerPhotos } from "@/lib/customer-photos/cleanup";

export const maxDuration = 60;

export async function GET(request: Request) {
  if (getCronAuthFailureStatus(request) === 401) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const client = createServiceClient();
  if (!client) return NextResponse.json({ error: "Unavailable" }, { status: 503 });
  try { return NextResponse.json({ deleted: await cleanupAbandonedCustomerPhotos(client) }); }
  catch { return NextResponse.json({ error: "Photo cleanup failed" }, { status: 500 }); }
}
