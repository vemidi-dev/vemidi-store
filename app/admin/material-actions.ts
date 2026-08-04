"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";

import { getFile, getString } from "@/lib/admin/form-data";
import { adminFormFields } from "@/lib/admin/form-fields";
import { deleteProductImage, getProductImagePath } from "@/lib/admin/storage";
import { resolveDefaultMaterialGroupId } from "@/lib/admin/variant-data";
import { PRODUCT_MATERIALS_SCOPE_ID } from "@/lib/images/constants";
import {
  processAndUploadImages,
  validateImageUploadBatch,
  type UploadedImage,
} from "@/lib/images/upload-image";
import {
  DEFAULT_VARIANT_GROUP_KEY,
  slugifyVariantGroupKey,
} from "@/lib/product-variants";
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
  let groupId =
    getString(formData, adminFormFields.material.groupId) || null;

  if (!name) {
    done("error", "Въведете име на варианта.");
  }

  if (!groupId) {
    groupId = await resolveDefaultMaterialGroupId(supabase);
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

  const payload: Record<string, unknown> = {
    name,
    description,
    image_url: imageUrl,
    is_active: true,
    sort_order: sortOrder,
  };
  if (groupId) {
    payload.group_id = groupId;
  }

  const { error } = await supabase.from("product_materials").insert(payload);

  if (error && imageUrl) {
    await deleteStoredImageBestEffort(supabase, imageUrl);
  }

  done(
    error ? "error" : "success",
    error ? "Вариантът не беше добавен." : "Вариантът е добавен.",
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
  let groupId =
    getString(formData, adminFormFields.material.groupId) || null;

  if (!id || !name) {
    done("error", "Невалидни данни за варианта.");
  }

  if (!groupId) {
    groupId = await resolveDefaultMaterialGroupId(supabase);
  }

  const { data: existing, error: loadError } = await supabase
    .from("product_materials")
    .select("id,image_url")
    .eq("id", id)
    .maybeSingle();

  if (loadError || !existing) {
    done("error", "Вариантът не беше намерен.");
  }

  let imageUrl = existing.image_url?.trim() || null;
  let uploadedUrl: string | null = null;

  if (file) {
    uploadedUrl = await uploadMaterialImage(supabase, file);
    imageUrl = uploadedUrl;
  }

  const payload: Record<string, unknown> = {
    name,
    description,
    image_url: imageUrl,
    is_active: isActive,
    updated_at: new Date().toISOString(),
  };
  if (groupId) {
    payload.group_id = groupId;
  }

  const { error } = await supabase
    .from("product_materials")
    .update(payload)
    .eq("id", id);

  if (error) {
    if (uploadedUrl) {
      await deleteStoredImageBestEffort(supabase, uploadedUrl);
    }
    done("error", "Вариантът не беше обновен.");
  }

  if (uploadedUrl && existing.image_url && existing.image_url !== uploadedUrl) {
    await deleteStoredImageBestEffort(supabase, existing.image_url);
  }

  done("success", "Вариантът е обновен.");
}

export async function deleteProductMaterial(formData: FormData) {
  const supabase = await getAuthorizedClient();
  const id = getString(formData, adminFormFields.material.id);
  if (!id) {
    done("error", "Липсва вариант за изтриване.");
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
    error ? "Вариантът не беше изтрит." : "Вариантът е изтрит.",
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

export async function createProductVariantGroup(formData: FormData) {
  const supabase = await getAuthorizedClient();
  const name = getString(formData, adminFormFields.variantGroup.name);
  const description =
    getString(formData, adminFormFields.variantGroup.description).slice(0, 500) ||
    null;
  const keyRaw = getString(formData, adminFormFields.variantGroup.key);
  const key = slugifyVariantGroupKey(keyRaw || name);

  if (!name) {
    done("error", "Въведете име на групата.");
  }

  if (key === DEFAULT_VARIANT_GROUP_KEY) {
    done("error", "Ключът „material“ е запазен за групата Материал.");
  }

  const { data: lastRow } = await supabase
    .from("product_variant_groups")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  const sortOrder = (Number(lastRow?.sort_order) || 0) + 10;

  const { error } = await supabase.from("product_variant_groups").insert({
    key,
    name,
    description,
    sort_order: sortOrder,
    is_active: true,
  });

  done(
    error ? "error" : "success",
    error
      ? "Групата не беше добавена (възможно дублиран ключ)."
      : "Групата е добавена.",
  );
}

export async function updateProductVariantGroup(formData: FormData) {
  const supabase = await getAuthorizedClient();
  const id = getString(formData, adminFormFields.variantGroup.id);
  const name = getString(formData, adminFormFields.variantGroup.name);
  const description =
    getString(formData, adminFormFields.variantGroup.description).slice(0, 500) ||
    null;
  const isActive = formData.get(adminFormFields.variantGroup.isActive) === "on";
  const sortOrderRaw = getString(formData, adminFormFields.variantGroup.sortOrder);
  const sortOrder = Number.parseInt(sortOrderRaw, 10);

  if (!id || !name) {
    done("error", "Невалидни данни за групата.");
  }

  const { data: existing, error: loadError } = await supabase
    .from("product_variant_groups")
    .select("id,key")
    .eq("id", id)
    .maybeSingle();

  if (loadError || !existing) {
    done("error", "Групата не беше намерена.");
  }

  if (existing.key === DEFAULT_VARIANT_GROUP_KEY && !isActive) {
    done("error", "Групата „Материал“ не може да бъде деактивирана.");
  }

  const { error } = await supabase
    .from("product_variant_groups")
    .update({
      name,
      description,
      is_active: isActive,
      sort_order: Number.isFinite(sortOrder) ? sortOrder : 0,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  done(
    error ? "error" : "success",
    error ? "Групата не беше обновена." : "Групата е обновена.",
  );
}
