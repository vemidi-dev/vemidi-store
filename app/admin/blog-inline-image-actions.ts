"use server";

import { BLOG_INLINE_SCOPE_ID } from "@/lib/images/constants";
import { isValidImageUuid } from "@/lib/images/storage-path";
import {
  processAndUploadImages,
  validateImageUploadBatch,
} from "@/lib/images/upload-image";
import { checkIsAdmin } from "@/lib/supabase/admin-auth";
import { createClient } from "@/lib/supabase/server";

const BLOG_IMAGE_PROFILE = "blog" as const;

export type UploadBlogInlineImageResult =
  | { ok: true; url: string; alt: string }
  | { ok: false; message: string };

async function getAuthorizedClient() {
  const supabase = await createClient();
  if (!supabase) {
    return null;
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return null;
  }

  const { isAdmin } = await checkIsAdmin(supabase, user.id);
  if (!isAdmin) {
    return null;
  }

  return supabase;
}

function resolveBlogInlineScopeId(postId: string | null | undefined) {
  const trimmed = postId?.trim() ?? "";
  if (trimmed && isValidImageUuid(trimmed)) {
    return trimmed;
  }
  return BLOG_INLINE_SCOPE_ID;
}

export async function uploadBlogInlineImage(
  formData: FormData,
): Promise<UploadBlogInlineImageResult> {
  const supabase = await getAuthorizedClient();
  if (!supabase) {
    return { ok: false, message: "Нямате права за качване на снимки." };
  }

  const fileValue = formData.get("image");
  const file =
    fileValue instanceof File && fileValue.size > 0 ? fileValue : null;
  if (!file) {
    return { ok: false, message: "Изберете снимка за качване." };
  }

  const alt = String(formData.get("alt") ?? "")
    .replace(/[\[\]]/g, "")
    .trim();
  const postId = String(formData.get("postId") ?? "").trim() || null;
  const scopeId = resolveBlogInlineScopeId(postId);

  const validationError = validateImageUploadBatch(BLOG_IMAGE_PROFILE, [file], 0);
  if (validationError) {
    return { ok: false, message: validationError };
  }

  try {
    const uploaded = await processAndUploadImages(
      supabase,
      BLOG_IMAGE_PROFILE,
      scopeId,
      [file],
      0,
    );
    const image = uploaded[0];
    if (!image?.url) {
      return { ok: false, message: "Снимката не беше качена." };
    }

    return { ok: true, url: image.url, alt };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error
          ? error.message
          : "Неуспешно качване на снимката.",
    };
  }
}
