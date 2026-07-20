import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import {
  buildOrdersCsv,
  loadOrdersForExport,
  normalizeOrderCsvColumns,
  parseOrdersQuery,
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

  const params = request.nextUrl.searchParams;
  const query = parseOrdersQuery({
    status: params.get("status") ?? "",
    search: params.get("q") ?? "",
    orderId: params.get("order_id") ?? "",
    source: params.get("source") ?? "",
    dateFrom: params.get("date_from") ?? "",
    dateTo: params.get("date_to") ?? "",
    payment: params.get("payment") ?? "",
    delivery: params.get("delivery") ?? "",
    sort: params.get("sort") ?? "",
  });

  const scope = params.get("scope");
  const selectedIds = params.getAll("ids");
  const exportScope =
    scope === "selected" || scope === "page" ? scope : "filtered";

  try {
    const orders = await loadOrdersForExport(supabase, query, {
      scope: exportScope,
      selectedIds,
      pageOrderIds: selectedIds,
    });
    const columns = normalizeOrderCsvColumns(params.getAll("columns"));
    const csv = `\uFEFF${buildOrdersCsv(orders, columns)}`;
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
  } catch {
    return NextResponse.json(
      { error: "Поръчките не могат да бъдат експортирани." },
      { status: 500 },
    );
  }
}
