"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { parseLandingPageFormData } from "@/lib/product-landing/admin-form";
import {
  deleteProductLandingPageAtomic,
  getLandingPageMutationErrorMessage,
  upsertProductLandingPageAtomic,
} from "@/lib/product-landing/admin-rpc";
import { getProductPath } from "@/lib/product-url";
import { checkIsAdmin } from "@/lib/supabase/admin-auth";
import { createClient } from "@/lib/supabase/server";

const ADMIN_PATH = "/admin";

async function getAuthorizedClient() {
  const supabase = await createClient();
  if (!supabase) {
    redirect("/admin/login");
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/admin/login");
  }

  const { isAdmin } = await checkIsAdmin(supabase, user.id);
  if (!isAdmin) {
    redirect("/admin/login");
  }

  return supabase;
}

function redirectWithProductEdit(
  kind: "success" | "error",
  message: string,
  productId: string,
): never {
  const params = new URLSearchParams({
    [kind]: message,
    tab: "products",
    editProduct: productId,
  });
  redirect(`${ADMIN_PATH}?${params.toString()}`);
}

function revalidateProductLandingPaths(productSlug: string) {
  revalidatePath(ADMIN_PATH);
  revalidatePath(getProductPath(productSlug));
  revalidatePath("/products/[slug]", "page");
  revalidatePath("/produkti/[slug]", "page");
}

export async function upsertProductLandingPage(formData: FormData) {
  const parsed = parseLandingPageFormData(formData);
  if (!parsed.ok) {
    const productId = String(formData.get("product_id") ?? "");
    redirectWithProductEdit("error", parsed.message, productId);
  }

  const supabase = await getAuthorizedClient();
  const { error } = await upsertProductLandingPageAtomic(supabase, parsed.payload);

  if (error) {
    redirectWithProductEdit(
      "error",
      getLandingPageMutationErrorMessage(error),
      parsed.payload.productId,
    );
  }

  revalidateProductLandingPaths(parsed.payload.productSlug);
  redirectWithProductEdit(
    "success",
    parsed.payload.landingId
      ? "Landing страницата е обновена."
      : "Landing страницата е създадена.",
    parsed.payload.productId,
  );
}

export async function deleteProductLandingPage(formData: FormData) {
  const landingId = String(formData.get("landing_page_id") ?? "").trim();
  const productId = String(formData.get("product_id") ?? "").trim();
  const productSlug = String(formData.get("product_slug") ?? "").trim();

  if (!landingId || !productId || !productSlug) {
    redirectWithProductEdit("error", "Невалидни данни за изтриване.", productId);
  }

  const supabase = await getAuthorizedClient();
  const { error } = await deleteProductLandingPageAtomic(supabase, landingId);

  if (error) {
    redirectWithProductEdit(
      "error",
      getLandingPageMutationErrorMessage(error),
      productId,
    );
  }

  revalidateProductLandingPaths(productSlug);
  redirectWithProductEdit("success", "Landing страницата е изтрита.", productId);
}
