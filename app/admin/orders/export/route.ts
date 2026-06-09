import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import {
  buildOrdersCsv,
  filterOrders,
  type OrderRow,
} from "@/lib/admin/orders";
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
    return NextResponse.json(
      { error: "Нямате достъп до поръчките." },
      { status: 403 },
    );
  }

  const result = await supabase
    .from("orders")
    .select("*")
    .order("created_at", { ascending: false });

  if (result.error) {
    return NextResponse.json(
      { error: "Поръчките не могат да бъдат експортирани." },
      { status: 500 },
    );
  }

  const orders = filterOrders((result.data ?? []) as OrderRow[], {
    status: request.nextUrl.searchParams.get("status") ?? "",
    source: request.nextUrl.searchParams.get("source") ?? "",
    search: request.nextUrl.searchParams.get("q") ?? "",
  });
  const csv = `\uFEFF${buildOrdersCsv(orders)}`;
  const date = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Sofia",
  }).format(new Date());

  return new NextResponse(csv, {
    headers: {
      "Cache-Control": "private, no-store",
      "Content-Disposition": `attachment; filename="vemidi-orders-${date}.csv"`,
      "Content-Type": "text/csv; charset=utf-8",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
