import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import {
  buildSubscriberCsv,
  filterSubscribers,
  normalizeSubscriberTopic,
} from "@/lib/admin/subscriptions";
import type { NewsletterSubscriberRow } from "@/lib/admin/types";
import { checkIsAdmin } from "@/lib/supabase/admin-auth";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase не е конфигуриран." }, { status: 503 });
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(
      new URL(
        `/admin/login?message=${encodeURIComponent("Моля, влезте като администратор.")}`,
        request.url,
      ),
    );
  }

  const { isAdmin, error: adminError } = await checkIsAdmin(supabase, user.id);
  if (adminError || !isAdmin) {
    return NextResponse.json({ error: "Нямате достъп до този списък." }, { status: 403 });
  }

  const result = await supabase
    .from("newsletter_subscribers")
    .select("id,email,topics,is_active,created_at,updated_at")
    .eq("is_active", true)
    .order("created_at", { ascending: true });

  if (result.error) {
    return NextResponse.json(
      { error: "Списъкът не може да бъде експортиран." },
      { status: 500 },
    );
  }

  const subscribers = filterSubscribers(
    (result.data ?? []) as NewsletterSubscriberRow[],
    {
      search: request.nextUrl.searchParams.get("q") ?? "",
      topic: normalizeSubscriberTopic(
        request.nextUrl.searchParams.get("topic") ?? "",
      ),
      status: "active",
    },
  );
  const csv = `\uFEFF${buildSubscriberCsv(subscribers)}`;
  const date = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Sofia",
  }).format(new Date());

  return new NextResponse(csv, {
    headers: {
      "Cache-Control": "private, no-store",
      "Content-Disposition": `attachment; filename="vemidi-subscribers-${date}.csv"`,
      "Content-Type": "text/csv; charset=utf-8",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
