import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

import {
  buildProductJsonImportAuthFailure,
  buildProductJsonImportRuntimeFailure,
  submitProductJsonImport,
} from "@/lib/admin/product-json-import-v2/import-submit";
import { checkIsAdmin } from "@/lib/supabase/admin-auth";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    if (!supabase) {
      return NextResponse.json(
        buildProductJsonImportAuthFailure("Supabase не е конфигуриран."),
        { status: 503 },
      );
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        buildProductJsonImportAuthFailure("Моля, влезте като администратор."),
        { status: 401 },
      );
    }

    const { isAdmin } = await checkIsAdmin(supabase, user.id);
    if (!isAdmin) {
      return NextResponse.json(
        buildProductJsonImportAuthFailure("Профилът няма админ права."),
        { status: 403 },
      );
    }

    const formData = await request.formData();
    const summary = await submitProductJsonImport(supabase, formData);
    revalidatePath("/admin");
    return NextResponse.json(summary);
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Неочаквана грешка при обработка на импорт заявката.";
    return NextResponse.json(buildProductJsonImportRuntimeFailure(message), {
      status: 500,
    });
  }
}
