"use server";

import { revalidatePath } from "next/cache";

import { runValidateProductJsonImport } from "@/lib/admin/product-json-import-v2/import-service";
import {
  buildProductJsonImportAuthFailure,
  submitProductJsonImport,
  type ProductJsonImportSubmitResult,
} from "@/lib/admin/product-json-import-v2/import-submit";
import type {
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

  try {
    return await runValidateProductJsonImport(auth.supabase, input);
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Неуспешна проверка на JSON импорта.";
    return { ok: false, message };
  }
}

export async function importProductsFromJson(
  formData: FormData,
): Promise<ProductJsonImportSubmitResult> {
  const auth = await getImportAuthorizedClient();
  if (!auth.ok) {
    return buildProductJsonImportAuthFailure(auth.message);
  }

  const summary = await submitProductJsonImport(auth.supabase, formData);
  revalidatePath("/admin");
  return summary;
}
