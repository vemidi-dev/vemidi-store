import { revalidateTag } from "next/cache";
import { HOME_PUBLIC_CACHE_TAG } from "@/lib/home/cache-tag";

export function revalidateHomePublicData() {
  revalidateTag(HOME_PUBLIC_CACHE_TAG);
}
