import type { SupabaseClient } from "@supabase/supabase-js";
import { CUSTOMER_PHOTO_BUCKET } from "./reference";

export async function cleanupAbandonedCustomerPhotos(client: SupabaseClient) {
  const { data, error } = await client.from("customer_product_photos")
    .select("id,storage_path").is("order_id", null).lt("expires_at", new Date().toISOString())
    .order("expires_at").limit(100);
  if (error) throw new Error("Photo cleanup lookup failed");
  if (!data?.length) return 0;
  // A customer may reuse the same photo in more than one order. Protect every surviving order snapshot.
  const abandoned: typeof data = [];
  for (const row of data) {
    const references = await client.from("orders").select("id", { count: "exact", head: true })
      .contains("raw_payload", { order: { items: [{ personalizationFields: [{ value: `upload:${row.id}` }] }] } });
    if (references.error || references.count === null) throw new Error("Photo cleanup order lookup failed");
    if (references.count === 0) abandoned.push(row);
  }
  if (!abandoned.length) return 0;
  const removed = await client.storage.from(CUSTOMER_PHOTO_BUCKET).remove(abandoned.map(row => row.storage_path));
  if (removed.error) throw new Error("Photo cleanup storage removal failed");
  const deleted = await client.from("customer_product_photos").delete().in("id", abandoned.map(row => row.id)).is("order_id", null);
  if (deleted.error) throw new Error("Photo cleanup metadata removal failed");
  return abandoned.length;
}
