"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getFile, getString } from "@/lib/admin/form-data";
import { adminFormFields } from "@/lib/admin/form-fields";
import { deleteProductImage, getProductImagePath } from "@/lib/admin/storage";
import {
  SITE_MEDIA_KEYS,
  type SiteMediaKey,
} from "@/lib/content/site-media-types";
import { SITE_MEDIA_SCOPE_ID } from "@/lib/images/constants";
import {
  processAndUploadImages,
  validateImageUploadBatch,
  type UploadedImage,
} from "@/lib/images/upload-image";
import { checkIsAdmin } from "@/lib/supabase/admin-auth";
import { createClient } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";

const ADMIN_CONTENT_PATH = "/admin?tab=content";
const HERO_PROFILE = "hero" as const;

const SITE_MEDIA_METADATA: Record<
  SiteMediaKey,
  { label: string; section: string; sort_order: number }
> = {
  "home.hero": {
    label: "Начало — основна hero снимка",
    section: "Начална страница",
    sort_order: 10,
  },
  "home.atelier": {
    label: "Начало — секция ателието",
    section: "Начална страница",
    sort_order: 20,
  },
  "shop.hero": {
    label: "Продукти — hero банер",
    section: "Hub страници",
    sort_order: 10,
  },
  "categories.hero": {
    label: "Категории — hero банер",
    section: "Hub страници",
    sort_order: 20,
  },
  "occasions.hero": {
    label: "По повод — hero банер",
    section: "Hub страници",
    sort_order: 30,
  },
  "blog.hero": {
    label: "Блог — hero банер",
    section: "Hub страници",
    sort_order: 40,
  },
  "events.hero": {
    label: "Събития — hero банер",
    section: "Hub страници",
    sort_order: 50,
  },
  "about.hero": {
    label: "За нас — основна снимка",
    section: "Други страници",
    sort_order: 10,
  },
  "checkout.thank_you": {
    label: "Благодарим за поръчката — снимка",
    section: "Други страници",
    sort_order: 20,
  },
};

function redirectWith(kind: "success" | "error", message: string): never {
  redirect(`${ADMIN_CONTENT_PATH}&${kind}=${encodeURIComponent(message)}`);
}

function isValidSiteMediaKey(key: string): key is SiteMediaKey {
  return (SITE_MEDIA_KEYS as readonly string[]).includes(key);
}

export function revalidateSiteMediaPaths() {
  revalidatePath("/");
  revalidatePath("/za-nas");
  revalidatePath("/producti");
  revalidatePath("/categorii");
  revalidatePath("/povodi");
  revalidatePath("/blog");
  revalidatePath("/sabitiya");
  revalidatePath("/thank-you");
  revalidatePath("/admin");
}

async function getAuthorizedClient(): Promise<SupabaseClient> {
  const supabase = await createClient();
  if (!supabase) {
    redirectWith("error", "Supabase не е конфигуриран.");
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

export async function updateSiteMediaImage(formData: FormData) {
  const supabase = await getAuthorizedClient();
  const key = getString(formData, adminFormFields.siteMedia.key);

  if (!isValidSiteMediaKey(key)) {
    redirectWith("error", "Невалиден ключ за изображение.");
  }

  const imageAlt = getString(
    formData,
    adminFormFields.siteMedia.imageAlt,
  ).slice(0, 160);
  const file = getFile(formData, adminFormFields.siteMedia.imageFile);

  const { data: existing, error: loadError } = await supabase
    .from("site_media")
    .select("key,label,section,sort_order,image_url,image_alt")
    .eq("key", key)
    .maybeSingle();

  if (loadError) {
    redirectWith("error", "Липсва миграцията site_media.sql в Supabase.");
  }

  const metadata = existing ?? SITE_MEDIA_METADATA[key];
  let imageUrl = existing?.image_url?.trim() || null;

  if (file) {
    const validationError = validateImageUploadBatch(HERO_PROFILE, [file], 0);
    if (validationError) {
      redirectWith("error", validationError);
    }

    let uploaded: UploadedImage[] = [];

    try {
      uploaded = await processAndUploadImages(
        supabase,
        HERO_PROFILE,
        SITE_MEDIA_SCOPE_ID,
        [file],
        0,
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Неуспешно качване на изображението.";
      redirectWith("error", message);
    }

    const nextImage = uploaded[0];
    if (!nextImage) {
      redirectWith("error", "Изображението не беше качено.");
    }

    imageUrl = nextImage.url;
    await deleteStoredImageBestEffort(supabase, existing?.image_url);
  } else if (!imageUrl) {
    redirectWith("error", "Изберете изображение за качване.");
  }

  const { error } = await supabase.from("site_media").upsert(
    {
      key,
      label: metadata.label,
      section: metadata.section,
      sort_order: metadata.sort_order,
      image_url: imageUrl,
      image_alt: imageAlt || null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "key" },
  );

  if (error) {
    redirectWith("error", `Изображението не беше запазено: ${error.message}`);
  }

  revalidateSiteMediaPaths();
  redirectWith("success", `${metadata.label} е обновено.`);
}

export async function clearSiteMediaImage(formData: FormData) {
  const supabase = await getAuthorizedClient();
  const key = getString(formData, adminFormFields.siteMedia.key);

  if (!isValidSiteMediaKey(key)) {
    redirectWith("error", "Невалиден ключ за изображение.");
  }

  const { data: existing, error: loadError } = await supabase
    .from("site_media")
    .select("key,label,section,sort_order,image_url,image_alt")
    .eq("key", key)
    .maybeSingle();

  if (loadError) {
    redirectWith("error", "Липсва миграцията site_media.sql в Supabase.");
  }

  if (!existing?.image_url?.trim()) {
    redirectWith("error", "Няма качено изображение за премахване.");
  }

  await deleteStoredImageBestEffort(supabase, existing.image_url);

  const metadata = existing ?? SITE_MEDIA_METADATA[key];
  const { error } = await supabase.from("site_media").upsert(
    {
      key,
      label: metadata.label,
      section: metadata.section,
      sort_order: metadata.sort_order,
      image_url: null,
      image_alt: null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "key" },
  );

  if (error) {
    redirectWith("error", `Изображението не беше премахнато: ${error.message}`);
  }

  revalidateSiteMediaPaths();
  redirectWith("success", `${metadata.label} вече използва резервната снимка.`);
}
