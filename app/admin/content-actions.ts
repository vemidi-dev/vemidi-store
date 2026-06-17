"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getFile, getOptionalString, getString, isChecked, normalizeSlug } from "@/lib/admin/form-data";
import {
  deleteProductImage,
  getProductImagePath,
  uploadAdminImage,
} from "@/lib/admin/storage";
import type { AdminTab } from "@/lib/admin/types";
import { checkIsAdmin } from "@/lib/supabase/admin-auth";
import { createClient } from "@/lib/supabase/server";

type ContentKind = "blog" | "events";
type PreviousContentRow = {
  image_url: string | null;
  slug: string;
  published_at?: string | null;
};

const config = {
  blog: {
    table: "blog_posts",
    folder: "blog" as const,
    publicPath: "/blog",
    singular: "Публикацията",
  },
  events: {
    table: "events",
    folder: "events" as const,
    publicPath: "/sabitiya",
    singular: "Събитието",
  },
};

function isValidSlug(value: string) {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value);
}

function validateContentFields({
  kind,
  title,
  slug,
  excerpt,
  content,
  isPublished,
  tab,
}: {
  kind: ContentKind;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  isPublished: boolean;
  tab: AdminTab;
}) {
  if (!title) {
    redirectWith("error", "Добавете заглавие.", tab);
  }
  if (!slug || !isValidSlug(slug)) {
    redirectWith(
      "error",
      "Slug трябва да съдържа само малки латински букви, цифри и тирета.",
      tab,
    );
  }
  if (kind === "events" || isPublished) {
    if (!excerpt) {
      redirectWith(
        "error",
        kind === "blog"
          ? "За публикуване добавете кратко описание на статията."
          : "Добавете кратко описание на събитието.",
        tab,
      );
    }
    if (!content) {
      redirectWith(
        "error",
        kind === "blog"
          ? "За публикуване добавете пълния текст на статията."
          : "Добавете пълния текст на събитието.",
        tab,
      );
    }
  }
}

function getBlogCta(formData: FormData, tab: AdminTab) {
  const ctaLinkLabel = getOptionalString(formData, "cta_link_label");
  const ctaCategoryId = getOptionalString(formData, "cta_category_id");

  if (Boolean(ctaLinkLabel) !== Boolean(ctaCategoryId)) {
    redirectWith(
      "error",
      ctaLinkLabel
        ? "Изберете категория за линка под статията или изтрийте името на линка."
        : "Добавете име на линка под статията или изберете „Без линк към категория“.",
      tab,
    );
  }

  return { ctaLinkLabel, ctaCategoryId };
}

function redirectWith(kind: "success" | "error", message: string, tab: AdminTab): never {
  const params = new URLSearchParams({ tab, [kind]: message });
  redirect(`/admin?${params.toString()}`);
}

async function getAuthorizedClient(tab: AdminTab) {
  const supabase = await createClient();
  if (!supabase) {
    redirectWith("error", "Supabase не е конфигуриран.", tab);
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect(`/admin/login?message=${encodeURIComponent("Моля, влезте като администратор.")}`);
  }

  const { isAdmin, error } = await checkIsAdmin(supabase, user.id);
  if (error || !isAdmin) {
    redirect(`/admin/login?message=${encodeURIComponent("Профилът няма админ права.")}`);
  }

  return supabase;
}

function parseDateTime(value: string) {
  if (!value) {
    return null;
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

function parseOptionalNumber(formData: FormData, key: string, integer = false) {
  const rawValue = getString(formData, key);
  if (!rawValue) return null;

  const value = Number(rawValue);
  if (!Number.isFinite(value) || value < 0) return null;

  return integer ? Math.floor(value) : value;
}

function getEventCapacity(formData: FormData, tab: AdminTab, useCapacityAsDefault: boolean) {
  const capacityRaw = getString(formData, "capacity");
  const availableSpotsRaw = getString(formData, "available_spots");
  const capacity = parseOptionalNumber(formData, "capacity", true);
  const submittedAvailableSpots = parseOptionalNumber(formData, "available_spots", true);
  const availableSpots =
    submittedAvailableSpots ?? (useCapacityAsDefault ? capacity : null);

  if (capacityRaw && (capacity === null || capacity < 1)) {
    redirectWith("error", "Максималният брой места трябва да бъде поне 1.", tab);
  }
  if (availableSpotsRaw && submittedAvailableSpots === null) {
    redirectWith("error", "Свободните места трябва да бъдат цяло положително число или 0.", tab);
  }
  if (capacity !== null && availableSpots !== null && availableSpots > capacity) {
    redirectWith(
      "error",
      "Свободните места не могат да бъдат повече от максималния брой места.",
      tab,
    );
  }

  return { capacity, availableSpots };
}

function revalidateContent(kind: ContentKind, slug?: string) {
  revalidatePath("/admin");
  revalidatePath("/");
  revalidatePath(config[kind].publicPath);
  revalidatePath("/sitemap.xml");
  if (slug) {
    revalidatePath(`${config[kind].publicPath}/${slug}`);
  }
}

async function createContent(formData: FormData, kind: ContentKind) {
  const tab: AdminTab = kind;
  const supabase = await getAuthorizedClient(tab);
  const title = getString(formData, "title");
  const slug = normalizeSlug(getString(formData, "slug"));
  const excerpt = getString(formData, "excerpt");
  const content = getString(formData, "content");
  const imageFile = getFile(formData, "image_file");
  const isPublished = kind === "blog"
    ? getString(formData, "submit_intent") === "publish"
    : isChecked(formData, "is_published");

  validateContentFields({ kind, title, slug, excerpt, content, isPublished, tab });

  const row: Record<string, unknown> = {
    title,
    slug,
    excerpt,
    content,
    is_published: isPublished,
    updated_at: new Date().toISOString(),
  };

  if (kind === "blog") {
    const { ctaLinkLabel, ctaCategoryId } = getBlogCta(formData, tab);
    row.category = getOptionalString(formData, "category");
    row.author = getOptionalString(formData, "author") ?? "VeMiDi crafts";
    row.read_minutes = parseOptionalNumber(formData, "read_minutes", true);
    row.is_featured = isChecked(formData, "is_featured");
    row.is_popular = isChecked(formData, "is_popular");
    row.cta_link_label = ctaLinkLabel;
    row.cta_category_id = ctaCategoryId;
    row.published_at = isPublished ? new Date().toISOString() : null;
  } else {
    const startsAt = parseDateTime(getString(formData, "starts_at"));
    const endsAt = parseDateTime(getString(formData, "ends_at"));
    const { capacity, availableSpots } = getEventCapacity(formData, tab, true);
    if (startsAt === undefined || endsAt === undefined) {
      redirectWith("error", "Датата или часът на събитието не е валиден.", tab);
    }
    row.location = getOptionalString(formData, "location");
    row.event_type = getOptionalString(formData, "event_type");
    row.audience = getOptionalString(formData, "audience");
    row.format = getOptionalString(formData, "format") ?? "in_person";
    row.price = parseOptionalNumber(formData, "price");
    row.capacity = capacity;
    row.available_spots = availableSpots;
    row.age_group = getOptionalString(formData, "age_group");
    row.address = getOptionalString(formData, "address");
    row.duration_minutes = parseOptionalNumber(formData, "duration_minutes", true);
    row.includes_text = getOptionalString(formData, "includes_text");
    row.materials_text = getOptionalString(formData, "materials_text");
    row.host_name = getOptionalString(formData, "host_name");
    row.cancellation_policy = getOptionalString(formData, "cancellation_policy");
    row.registration_url = getOptionalString(formData, "registration_url");
    row.starts_at = startsAt;
    row.ends_at = endsAt;
  }

  let uploaded: Awaited<ReturnType<typeof uploadAdminImage>> | null = null;
  if (imageFile) {
    try {
      uploaded = await uploadAdminImage(supabase, imageFile, config[kind].folder);
      row.image_url = uploaded.url;
    } catch (error) {
      redirectWith(
        "error",
        `Снимката не беше качена: ${error instanceof Error ? error.message : "неизвестна грешка"}`,
        tab,
      );
    }
  }

  const { error } = await supabase.from(config[kind].table).insert(row);
  if (error) {
    if (uploaded) {
      await deleteProductImage(supabase, uploaded.path).catch(() => undefined);
    }
    redirectWith("error", `Съдържанието не беше добавено: ${error.message}`, tab);
  }

  revalidateContent(kind, slug);
  redirectWith("success", `${config[kind].singular} е добавено успешно.`, tab);
}

async function updateContent(
  formData: FormData,
  kind: ContentKind,
  forcedPublicationState?: boolean,
) {
  const tab: AdminTab = kind;
  const supabase = await getAuthorizedClient(tab);
  const id = getString(formData, "id");
  const title = getString(formData, "title");
  const slug = normalizeSlug(getString(formData, "slug"));
  const excerpt = getString(formData, "excerpt");
  const content = getString(formData, "content");
  const existingImageUrl = getOptionalString(formData, "existing_image_url");
  const imageFile = getFile(formData, "image_file");
  const isPublished = kind === "blog"
    ? forcedPublicationState ?? getString(formData, "submit_intent") === "publish"
    : isChecked(formData, "is_published");

  if (!id) {
    redirectWith("error", "Липсва съдържание за редактиране.", tab);
  }
  validateContentFields({ kind, title, slug, excerpt, content, isPublished, tab });

  const { data: previous } = await supabase
    .from(config[kind].table)
    .select("*")
    .eq("id", id)
    .maybeSingle();
  const previousRow = previous as PreviousContentRow | null;

  const row: Record<string, unknown> = {
    title,
    slug,
    excerpt,
    content,
    image_url: existingImageUrl,
    is_published: isPublished,
    updated_at: new Date().toISOString(),
  };

  if (kind === "blog") {
    const { ctaLinkLabel, ctaCategoryId } = getBlogCta(formData, tab);
    row.category = getOptionalString(formData, "category");
    row.author = getOptionalString(formData, "author") ?? "VeMiDi crafts";
    row.read_minutes = parseOptionalNumber(formData, "read_minutes", true);
    row.is_featured = isChecked(formData, "is_featured");
    row.is_popular = isChecked(formData, "is_popular");
    row.cta_link_label = ctaLinkLabel;
    row.cta_category_id = ctaCategoryId;
    row.published_at = isPublished
      ? (previousRow?.published_at ?? new Date().toISOString())
      : null;
  } else {
    const startsAt = parseDateTime(getString(formData, "starts_at"));
    const endsAt = parseDateTime(getString(formData, "ends_at"));
    const { capacity, availableSpots } = getEventCapacity(formData, tab, false);
    if (startsAt === undefined || endsAt === undefined) {
      redirectWith("error", "Датата или часът на събитието не е валиден.", tab);
    }
    row.location = getOptionalString(formData, "location");
    row.event_type = getOptionalString(formData, "event_type");
    row.audience = getOptionalString(formData, "audience");
    row.format = getOptionalString(formData, "format") ?? "in_person";
    row.price = parseOptionalNumber(formData, "price");
    row.capacity = capacity;
    row.available_spots = availableSpots;
    row.age_group = getOptionalString(formData, "age_group");
    row.address = getOptionalString(formData, "address");
    row.duration_minutes = parseOptionalNumber(formData, "duration_minutes", true);
    row.includes_text = getOptionalString(formData, "includes_text");
    row.materials_text = getOptionalString(formData, "materials_text");
    row.host_name = getOptionalString(formData, "host_name");
    row.cancellation_policy = getOptionalString(formData, "cancellation_policy");
    row.registration_url = getOptionalString(formData, "registration_url");
    row.starts_at = startsAt;
    row.ends_at = endsAt;
  }

  let uploaded: Awaited<ReturnType<typeof uploadAdminImage>> | null = null;
  if (imageFile) {
    try {
      uploaded = await uploadAdminImage(supabase, imageFile, config[kind].folder);
      row.image_url = uploaded.url;
    } catch (error) {
      redirectWith(
        "error",
        `Снимката не беше качена: ${error instanceof Error ? error.message : "неизвестна грешка"}`,
        tab,
      );
    }
  }

  const { error } = await supabase.from(config[kind].table).update(row).eq("id", id);
  if (error) {
    if (uploaded) {
      await deleteProductImage(supabase, uploaded.path).catch(() => undefined);
    }
    redirectWith("error", `Промените не бяха запазени: ${error.message}`, tab);
  }

  if (uploaded && previousRow?.image_url && previousRow.image_url !== uploaded.url) {
    const oldPath = getProductImagePath(previousRow.image_url);
    if (oldPath) {
      await deleteProductImage(supabase, oldPath).catch(() => undefined);
    }
  }

  revalidateContent(kind, previousRow?.slug);
  revalidateContent(kind, slug);
  redirectWith("success", `${config[kind].singular} е обновено успешно.`, tab);
}

async function deleteContent(formData: FormData, kind: ContentKind) {
  const tab: AdminTab = kind;
  const supabase = await getAuthorizedClient(tab);
  const id = getString(formData, "id");
  if (!id) {
    redirectWith("error", "Липсва съдържание за изтриване.", tab);
  }

  const { data: previous } = await supabase
    .from(config[kind].table)
    .select("image_url,slug")
    .eq("id", id)
    .maybeSingle();
  const { error } = await supabase.from(config[kind].table).delete().eq("id", id);
  if (error) {
    redirectWith("error", `Съдържанието не беше изтрито: ${error.message}`, tab);
  }

  const imagePath = getProductImagePath(previous?.image_url);
  if (imagePath) {
    await deleteProductImage(supabase, imagePath).catch(() => undefined);
  }

  revalidateContent(kind, String(previous?.slug ?? ""));
  redirectWith("success", `${config[kind].singular} е изтрито.`, tab);
}

export async function createBlogPost(formData: FormData) {
  return createContent(formData, "blog");
}
export async function updateBlogPost(formData: FormData) {
  return updateContent(formData, "blog");
}
export async function saveBlogPostDraft(formData: FormData) {
  return updateContent(formData, "blog", false);
}
export async function publishBlogPost(formData: FormData) {
  return updateContent(formData, "blog", true);
}
export async function deleteBlogPost(formData: FormData) {
  return deleteContent(formData, "blog");
}
export async function createEvent(formData: FormData) {
  return createContent(formData, "events");
}
export async function updateEvent(formData: FormData) {
  return updateContent(formData, "events");
}
export async function deleteEvent(formData: FormData) {
  return deleteContent(formData, "events");
}
