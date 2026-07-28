"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";

import { getFile, getString } from "@/lib/admin/form-data";
import { adminFormFields } from "@/lib/admin/form-fields";
import { deleteProductImage, getProductImagePath } from "@/lib/admin/storage";
import { PRODUCT_MATERIALS_SCOPE_ID } from "@/lib/images/constants";
import {
  processAndUploadImages,
  validateImageUploadBatch,
  type UploadedImage,
} from "@/lib/images/upload-image";
import { checkIsAdmin } from "@/lib/supabase/admin-auth";
import { createClient } from "@/lib/supabase/server";

const IMAGE_PROFILE = "category" as const;

function done(kind: "success" | "error", message: string): never {
  revalidatePath("/admin");
  revalidatePath("/admin", "layout");
  const params = new URLSearchParams({
    tab: "materials",
    [kind]: message,
    _refresh: Date.now().toString(),
  });
  redirect(`/admin?${params.toString()}`);
}

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

async function deleteStoredImageBestEffort(
  supabase: SupabaseClient,
  imageUrl: string | null | undefined,
) {
  const path = getProductImagePath(imageUrl);
  if (!path) {
    return;
  }
  await deleteProductImage(supabase, path).catch(() => undefined);
}

async function uploadMaterialImage(
  supabase: SupabaseClient,
  file: File,
): Promise<string> {
  const validationError = validateImageUploadBatch(IMAGE_PROFILE, [file], 0);
  if (validationError) {
    done("error", validationError);
  }

  let uploaded: UploadedImage[] = [];
  try {
    uploaded = await processAndUploadImages(
      supabase,
      IMAGE_PROFILE,
      PRODUCT_MATERIALS_SCOPE_ID,
      [file],
      0,
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Неуспешно качване на изображението.";
    done("error", message);
  }

  const url = uploaded[0]?.url?.trim();
  if (!url) {
    done("error", "Изображението не беше качено.");
  }
  return url;
}

export async function createProductMaterial(formData: FormData) {
  const supabase = await getAuthorizedClient();
  const name = getString(formData, adminFormFields.material.name);
  const description =
    getString(formData, adminFormFields.material.description).slice(0, 500) || null;
  const file = getFile(formData, adminFormFields.material.imageFile);

  if (!name) {
    done("error", "Въведете име на материала.");
  }

  const { data: lastRow } = await supabase
    .from("product_materials")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  const sortOrder = (Number(lastRow?.sort_order) || 0) + 10;

  let imageUrl: string | null = null;
  if (file) {
    imageUrl = await uploadMaterialImage(supabase, file);
  }

  const { error } = await supabase.from("product_materials").insert({
    name,
    description,
    image_url: imageUrl,
    is_active: true,
    sort_order: sortOrder,
  });

  if (error && imageUrl) {
    await deleteStoredImageBestEffort(supabase, imageUrl);
  }

  done(
    error ? "error" : "success",
    error ? "Материалът не беше добавен." : "Материалът е добавен.",
  );
}

export async function updateProductMaterial(formData: FormData) {
  const supabase = await getAuthorizedClient();
  const id = getString(formData, adminFormFields.material.id);
  const name = getString(formData, adminFormFields.material.name);
  const description =
    getString(formData, adminFormFields.material.description).slice(0, 500) || null;
  const isActive = formData.get(adminFormFields.material.isActive) === "on";
  const file = getFile(formData, adminFormFields.material.imageFile);

  if (!id || !name) {
    done("error", "Невалидни данни за материала.");
  }

  const { data: existing, error: loadError } = await supabase
    .from("product_materials")
    .select("id,image_url")
    .eq("id", id)
    .maybeSingle();

  if (loadError || !existing) {
    done("error", "Материалът не беше намерен.");
  }

  let imageUrl = existing.image_url?.trim() || null;
  let uploadedUrl: string | null = null;

  if (file) {
    uploadedUrl = await uploadMaterialImage(supabase, file);
    imageUrl = uploadedUrl;
  }

  const { error } = await supabase
    .from("product_materials")
    .update({
      name,
      description,
      image_url: imageUrl,
      is_active: isActive,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    if (uploadedUrl) {
      await deleteStoredImageBestEffort(supabase, uploadedUrl);
    }
    done("error", "Материалът не беше обновен.");
  }

  if (uploadedUrl && existing.image_url && existing.image_url !== uploadedUrl) {
    await deleteStoredImageBestEffort(supabase, existing.image_url);
  }

  done("success", "Материалът е обновен.");
}

export async function deleteProductMaterial(formData: FormData) {
  const supabase = await getAuthorizedClient();
  const id = getString(formData, adminFormFields.material.id);
  if (!id) {
    done("error", "Липсва материал за изтриване.");
  }

  const { data: existing } = await supabase
    .from("product_materials")
    .select("id,image_url")
    .eq("id", id)
    .maybeSingle();

  const { error } = await supabase.from("product_materials").delete().eq("id", id);
  if (!error && existing?.image_url) {
    await deleteStoredImageBestEffort(supabase, existing.image_url);
  }

  done(
    error ? "error" : "success",
    error ? "Материалът не беше изтрит." : "Материалът е изтрит.",
  );
}

export async function moveProductMaterial(formData: FormData) {
  const supabase = await getAuthorizedClient();
  const id = getString(formData, adminFormFields.material.id);
  const direction = getString(formData, adminFormFields.material.direction);
  if (!id || (direction !== "up" && direction !== "down")) {
    done("error", "Невалидно преместване.");
  }

  const { error } = await supabase.rpc("admin_move_product_material", {
    p_material_id: id,
    p_direction: direction,
  });

  done(
    error ? "error" : "success",
    error ? "Редът не беше променен." : "Редът е променен.",
  );
}
