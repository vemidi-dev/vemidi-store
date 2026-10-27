import "server-only";
import { createHash } from "node:crypto";
import { cookies } from "next/headers";
import { CUSTOMER_PHOTO_COOKIE } from "./reference";
import { isUuid } from "@/lib/is-uuid";

export async function customerPhotoOwnerHash() {
  const token = (await cookies()).get(CUSTOMER_PHOTO_COOKIE)?.value;
  return token && isUuid(token) ? createHash("sha256").update(token).digest("hex") : null;
}
