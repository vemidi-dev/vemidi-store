import { revalidatePath } from "next/cache";

import { getProductPath } from "@/lib/product-url";
import { createClient } from "@/lib/supabase/server";

export function revalidateGlobalFaqPaths() {
  revalidatePath("/");
  revalidatePath("/products/[slug]", "page");
  revalidatePath("/produkti/[slug]", "page");
}

export async function revalidateProductFaqPath(productId?: string) {
  revalidatePath("/products/[slug]", "page");
  revalidatePath("/produkti/[slug]", "page");

  if (!productId?.trim()) {
    return;
  }

  const supabase = await createClient();
  if (!supabase) {
    return;
  }

  const { data } = await supabase
    .from("products")
    .select("slug")
    .eq("id", productId)
    .maybeSingle();

  if (data?.slug) {
    revalidatePath(getProductPath(String(data.slug)));
  }
}
