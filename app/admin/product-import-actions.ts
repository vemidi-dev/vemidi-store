"use server";

import { revalidatePath } from "next/cache";

import {
  runImportProductsFromJson,
  runValidateProductJsonImport,
} from "@/lib/admin/product-json-import-v2/import-service";
import type {
  ProductJsonImportSummaryResult,
  ProductJsonImportValidationResult,
  ValidateProductJsonImportInput,
} from "@/lib/admin/product-json-import-v2/types";
import { checkIsAdmin } from "@/lib/supabase/admin-auth";
import { createClient } from "@/lib/supabase/server";

type AuthResult =
  | { ok: true; supabase: NonNullable<Awaited<ReturnType<typeof createClient>>> }
  | { ok: false; message: string };

async function getImportAuthorizedClient(): Promise<AuthResult> {
  const supabase = await createClient();
  if (!supabase) {
    return { ok: false, message: "Supabase не е конфигуриран." };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, message: "Моля, влезте като администратор." };
  }

  const { isAdmin } = await checkIsAdmin(supabase, user.id);
  if (!isAdmin) {
    return { ok: false, message: "Профилът няма админ права." };
  }

  return { ok: true, supabase };
}

export async function validateProductJsonImport(
  input: ValidateProductJsonImportInput,
): Promise<ProductJsonImportValidationResult | { ok: false; message: string }> {
  const auth = await getImportAuthorizedClient();
  if (!auth.ok) {
    return auth;
  }

  return runValidateProductJsonImport(auth.supabase, input);
}

export async function importProductsFromJson(
  formData: FormData,
): Promise<ProductJsonImportSummaryResult | { ok: false; message: string }> {
  const auth = await getImportAuthorizedClient();
  if (!auth.ok) {
    return auth;
  }

  const json = String(formData.get("json") ?? "").trim();
  if (!json) {
    return { ok: false, message: "Липсва JSON payload." };
  }

  const imageFiles = formData
    .getAll("image_files")
    .filter((value): value is File => value instanceof File && value.size > 0);

  const summary = await runImportProductsFromJson(auth.supabase, json, imageFiles);
  revalidatePath("/admin");
  return summary;
}
