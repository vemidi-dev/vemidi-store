"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getString } from "@/lib/admin/form-data";
import { adminFormFields } from "@/lib/admin/form-fields";
import { getProductImagePath } from "@/lib/admin/storage";
import { EVENT_GALLERY_SCOPE_ID } from "@/lib/images/constants";
import {
  createSupabaseImageStorageAdapter,
  deleteStoragePathsBestEffort,
  getUploadedImagePaths,
  processAndUploadImages,
  validateImageUploadBatch,
  type UploadedImage,
} from "@/lib/images/upload-image";
import { checkIsAdmin } from "@/lib/supabase/admin-auth";
import { createClient } from "@/lib/supabase/server";

const EVENT_GALLERY_PROFILE = "event_gallery" as const;

function done(kind: "success" | "error", message: string): never {
  revalidatePath("/admin");
  revalidatePath("/sabitiya");
  redirect(`/admin?tab=events&${kind}=${encodeURIComponent(message)}`);
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

function getFiles(formData: FormData, fieldName: string) {
  return formData
    .getAll(fieldName)
    .filter((value): value is File => value instanceof File && value.size > 0);
}

async function getEventGalleryImageCount(
  supabase: Awaited<ReturnType<typeof getAuthorizedClient>>,
) {
  const { count, error } = await supabase
    .from("event_gallery_images")
    .select("id", { count: "exact", head: true });

  return error ? 0 : count ?? 0;
}

export async function uploadEventGalleryImages(formData: FormData) {
  const supabase = await getAuthorizedClient();
  const files = getFiles(formData, adminFormFields.eventGallery.imageFiles);
  const defaultAlt = getString(formData, adminFormFields.eventGallery.defaultAlt);
  const existingCount = await getEventGalleryImageCount(supabase);
  const galleryUploadError = validateImageUploadBatch(
    EVENT_GALLERY_PROFILE,
    files,
    existingCount,
  );

  if (files.length === 0) {
    done("error", "Изберете поне една снимка за галерията.");
  }

  if (galleryUploadError) {
    done("error", galleryUploadError);
  }

  let uploaded: UploadedImage[] = [];

  try {
    uploaded = await processAndUploadImages(
      supabase,
      EVENT_GALLERY_PROFILE,
      EVENT_GALLERY_SCOPE_ID,
      files,
      existingCount,
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Неуспешно качване на снимките.";
    done("error", message);
  }

  const { error } = await supabase.rpc("admin_attach_event_gallery_images", {
    p_images: uploaded.map((image) => ({
      image_url: image.url,
      alt_text: defaultAlt || "Снимка от творческа работилница",
      is_published: true,
    })),
  });

  if (error) {
    const adapter = createSupabaseImageStorageAdapter(supabase);
    await deleteStoragePathsBestEffort(adapter, getUploadedImagePaths(uploaded));
    done(
      "error",
      error.message.includes("Could not find the function")
        ? "Липсва SQL миграцията event_gallery_images.sql."
        : "Снимките не бяха записани в галерията.",
    );
  }

  done(
    "success",
    uploaded.length === 1
      ? "Снимката е добавена в галерията."
      : `${uploaded.length} снимки са добавени в галерията.`,
  );
}

export async function moveEventGalleryImage(formData: FormData) {
  const supabase = await getAuthorizedClient();
  const imageId = getString(formData, adminFormFields.eventGallery.imageId);
  const direction = getString(formData, adminFormFields.eventGallery.direction);

  if (!imageId || !["up", "down"].includes(direction)) {
    done("error", "Невалидна заявка за преместване.");
  }

  const { data: moved, error } = await supabase.rpc("admin_move_event_gallery_image", {
    p_image_id: imageId,
    p_direction: direction,
  });

  if (error) {
    done("error", "Снимката не беше преместена.");
  }

  done(
    "success",
    moved === true ? "Редът на снимките е променен." : "Снимката вече е в края на реда.",
  );
}

export async function deleteEventGalleryImage(formData: FormData) {
  const supabase = await getAuthorizedClient();
  const imageId = getString(formData, adminFormFields.eventGallery.imageId);

  if (!imageId) {
    done("error", "Липсва снимка за изтриване.");
  }

  const { data, error } = await supabase.rpc("admin_delete_event_gallery_image", {
    p_image_id: imageId,
  });

  if (error || !data || typeof data !== "object") {
    done("error", "Снимката не беше изтрита.");
  }

  const result = data as { image_url?: unknown };
  const imagePath = getProductImagePath(
    typeof result.image_url === "string" ? result.image_url : null,
  );

  if (imagePath) {
    const adapter = createSupabaseImageStorageAdapter(supabase);
    const cleanup = await deleteStoragePathsBestEffort(adapter, [imagePath]);
    if (cleanup.errorMessage) {
      done("error", cleanup.errorMessage);
    }
  }

  done("success", "Снимката е изтрита от галерията.");
}
