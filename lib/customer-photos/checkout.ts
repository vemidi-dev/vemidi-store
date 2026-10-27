import type { SupabaseClient } from "@supabase/supabase-js";
import type { ProductPersonalizationValue } from "@/lib/product-personalization";
import type { PersonalizationFieldDefinition } from "@/lib/checkout-personalization";
import { customerPhotoId, isUsableCustomerPhoto, type CustomerPhotoRow } from "./reference";

export async function verifyCheckoutCustomerPhotos(
  client: SupabaseClient,
  ownerHash: string | null,
  productId: string,
  definitions: PersonalizationFieldDefinition[],
  fields: ProductPersonalizationValue[],
) {
  const photoFieldIds = new Set(definitions.filter(field => field.field_type === "file").map(field => field.id));
  const submitted = fields.filter(field => photoFieldIds.has(field.fieldId));
  if (!submitted.length) return true;
  if (!ownerHash) return false;
  const ids = submitted.map(field => customerPhotoId(field.value));
  if (ids.some(id => !id)) return false;
  const { data, error } = await client.from("customer_product_photos").select("*").in("id", ids);
  if (error) return false;
  const rows = (data ?? []) as CustomerPhotoRow[];
  return submitted.every(field => isUsableCustomerPhoto(
    rows.find(row => row.id === customerPhotoId(field.value)) ?? null,
    ownerHash, productId, field.fieldId,
  ));
}
