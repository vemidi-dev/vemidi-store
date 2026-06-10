"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getString } from "@/lib/admin/form-data";
import { adminFormFields } from "@/lib/admin/form-fields";
import {
  deleteProductImage,
  getProductImagePath,
  uploadEventGalleryImage,
  type UploadedProductImage,
} from "@/lib/admin/storage";
import { checkIsAdmin } from "@/lib/supabase/admin-auth";
import { createClient } from "@/lib/supabase/server";

const MAX_GALLERY_FILES_PER_UPLOAD = 9;
const MAX_GALLERY_UPLOAD_BYTES = 9 * 1024 * 1024;

function done(kind: "success" | "error", message: string): never {
  revalidatePath("/admin");
  revalidatePath("/events");
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

function getGalleryUploadError(files: File[]) {
  if (files.length > MAX_GALLERY_FILES_PER_UPLOAD) {
    return `Изберете най-много ${MAX_GALLERY_FILES_PER_UPLOAD} снимки наведнъж.`;
  }

  const totalSize = files.reduce((sum, file) => sum + file.size, 0);
  if (totalSize > MAX_GALLERY_UPLOAD_BYTES) {
    return "Общият размер на снимките трябва да бъде до 9 MB.";
  }

  return null;
}

async function deleteImagesBestEffort(
  supabase: Awaited<ReturnType<typeof getAuthorizedClient>>,
  images: UploadedProductImage[],
) {
  await Promise.all(
    images.map(async (image) => {
      try {
        await deleteProductImage(supabase, image.path);
      } catch {
        // Best effort cleanup.
      }
    }),
  );
}

export async function uploadEventGalleryImages(formData: FormData) {
  const supabase = await getAuthorizedClient();
  const files = getFiles(formData, adminFormFields.eventGallery.imageFiles);
  const defaultAlt = getString(formData, adminFormFields.eventGallery.defaultAlt);
  const galleryUploadError = getGalleryUploadError(files);

  if (files.length === 0) {
    done("error", "Изберете поне една снимка за галерията.");
  }

  if (galleryUploadError) {
    done("error", galleryUploadError);
  }

  const uploaded: UploadedProductImage[] = [];

  try {
    for (const file of files) {
      uploaded.push(await uploadEventGalleryImage(supabase, file));
    }
  } catch (error) {
    await deleteImagesBestEffort(supabase, uploaded);
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
    await deleteImagesBestEffort(supabase, uploaded);
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
    try {
      await deleteProductImage(supabase, imagePath);
    } catch {
      // DB row is already removed.
    }
  }

  done("success", "Снимката е изтрита от галерията.");
}
