import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { isUuid } from "@/lib/is-uuid";
import { getRequestFingerprint } from "@/lib/request-fingerprint";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { CUSTOMER_PHOTO_BUCKET, CUSTOMER_PHOTO_COOKIE, CUSTOMER_PHOTO_DAYS, CUSTOMER_PHOTO_MAX_BYTES } from "@/lib/customer-photos/reference";
import { customerPhotoOwnerHash } from "@/lib/customer-photos/session";
import { processCustomerPhoto } from "@/lib/customer-photos/process-image";
import { checkIsAdmin } from "@/lib/supabase/admin-auth";

export const runtime = "nodejs";
export const maxDuration = 30;

function failure(message: string, status = 400) {
  return NextResponse.json({ message }, { status, headers: { "Cache-Control": "no-store" } });
}

export async function GET() {
  const response = NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  if (!await customerPhotoOwnerHash()) {
    response.cookies.set(CUSTOMER_PHOTO_COOKIE, randomUUID(), {
      httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/",
      maxAge: CUSTOMER_PHOTO_DAYS * 86400,
    });
  }
  return response;
}

export async function POST(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin) return failure("Невалидна заявка.", 403);
  const ownerHash = await customerPhotoOwnerHash();
  if (!ownerHash) return failure("Обновете страницата и изберете снимката отново.");
  if (Number(request.headers.get("content-length")) > CUSTOMER_PHOTO_MAX_BYTES + 64 * 1024) {
    return failure("Изберете снимка до 4 MB.", 413);
  }
  const service = createServiceClient();
  const publicClient = await createClient();
  const key = await getRequestFingerprint("customer-photo");
  if (!service || !publicClient || !key) return failure("Качването временно не е достъпно.", 503);
  const rate = await service.rpc("check_store_checkout_rate_limit", { p_client_key: key, p_limit: 20, p_window_seconds: 900 });
  if (rate.error || rate.data !== true) return failure("Твърде много качвания. Опитайте по-късно.", 429);
  try {
    const form = await request.formData();
    const productId = String(form.get("productId") ?? "");
    const fieldId = String(form.get("fieldId") ?? "");
    const file = form.get("photo");
    if (!isUuid(productId) || !isUuid(fieldId) || !(file instanceof File)) return failure("Невалидни данни за снимката.");
    if (file.size > CUSTOMER_PHOTO_MAX_BYTES) return failure("Изберете снимка до 4 MB.", 413);
    // Public RLS must confirm that the product is visible, even though storage uses the service client.
    let product = await publicClient.from("products").select("id").eq("id", productId).eq("status", "published").eq("visibility", "public").maybeSingle();
    if (!product.data && !product.error) {
      const user = (await publicClient.auth.getUser()).data.user;
      if (user && (await checkIsAdmin(publicClient, user.id)).isAdmin) {
        product = await publicClient.from("products").select("id").eq("id", productId).maybeSingle();
      }
    }
    const field = await service.from("product_personalization_fields").select("id").eq("id", fieldId).eq("product_id", productId).eq("field_type", "file").maybeSingle();
    if (!product.data || !field.data || product.error || field.error) return failure("Продуктът или полето за снимка не са налични.");
    const processed = await processCustomerPhoto(Buffer.from(await file.arrayBuffer()));
    const id = randomUUID();
    const storagePath = `${ownerHash}/${id}.${processed.extension}`;
    const uploaded = await service.storage.from(CUSTOMER_PHOTO_BUCKET).upload(storagePath, processed.data, { contentType: processed.contentType, upsert: false });
    if (uploaded.error) return failure("Снимката не беше качена. Опитайте отново.", 503);
    const stored = await service.from("customer_product_photos").insert({
      id, product_id: productId, field_id: fieldId, owner_hash: ownerHash, storage_path: storagePath,
      original_filename: file.name.replace(/[\r\n/\\]/g, "_").slice(0, 180),
    });
    if (stored.error) {
      await service.storage.from(CUSTOMER_PHOTO_BUCKET).remove([storagePath]);
      return failure("Снимката не беше запазена. Опитайте отново.", 503);
    }
    return NextResponse.json({ value: `upload:${id}`, filename: file.name.slice(0, 180) }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return failure("Снимката не може да бъде прочетена. Изберете валиден JPEG или PNG до 4 MB.");
  }
}
