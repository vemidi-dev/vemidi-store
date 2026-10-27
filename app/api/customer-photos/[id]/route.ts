import { NextResponse } from "next/server";
import { isUuid } from "@/lib/is-uuid";
import { checkIsAdmin } from "@/lib/supabase/admin-auth";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { CUSTOMER_PHOTO_BUCKET, type CustomerPhotoRow } from "@/lib/customer-photos/reference";
import { customerPhotoOwnerHash } from "@/lib/customer-photos/session";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const denied = () => new NextResponse("Снимката не е достъпна.", { status: 404, headers: { "Cache-Control": "no-store" } });
  if (!isUuid(id)) return denied();
  const service = createServiceClient();
  if (!service) return denied();
  const { data, error } = await service.from("customer_product_photos").select("*").eq("id", id).maybeSingle();
  const photo = data as CustomerPhotoRow | null;
  if (error || !photo) return denied();
  const owner = await customerPhotoOwnerHash();
  let allowed = owner === photo.owner_hash && Date.parse(photo.expires_at) > Date.now();
  if (!allowed) {
    const client = await createClient();
    const user = client ? (await client.auth.getUser()).data.user : null;
    allowed = Boolean(client && user && (await checkIsAdmin(client, user.id)).isAdmin);
  }
  if (!allowed) return denied();
  const download = new URL(request.url).searchParams.get("download") === "1";
  const signed = await service.storage.from(CUSTOMER_PHOTO_BUCKET).createSignedUrl(photo.storage_path, 60, {
    download: download ? photo.original_filename.replace(/\.[^.]+$/, "") + (photo.storage_path.endsWith(".png") ? ".png" : ".jpg") : false,
  });
  if (signed.error || !signed.data) return denied();
  const response = NextResponse.redirect(signed.data.signedUrl);
  response.headers.set("Cache-Control", "private, no-store");
  response.headers.set("Referrer-Policy", "no-referrer");
  return response;
}
