"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getOptionalString, getString, isChecked, normalizeSlug } from "@/lib/admin/form-data";
import { adminFormFields } from "@/lib/admin/form-fields";
import { isValidBlogCategorySlug } from "@/lib/blog-categories";
import { checkIsAdmin } from "@/lib/supabase/admin-auth";
import { createClient } from "@/lib/supabase/server";

function done(kind: "success" | "error", message: string): never {
  revalidatePath("/admin");
  revalidatePath("/blog");
  redirect(`/admin?tab=blog&${kind}=${encodeURIComponent(message)}`);
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

function parseSortOrder(formData: FormData) {
  const raw = getString(formData, adminFormFields.blogCategory.sortOrder);
  if (!raw) {
    return 0;
  }
  const parsed = Number(raw);
  return Number.isInteger(parsed) ? parsed : null;
}

export async function createBlogCategory(formData: FormData) {
  const supabase = await getAuthorizedClient();
  const name = getString(formData, adminFormFields.blogCategory.name);
  const slug = normalizeSlug(getString(formData, adminFormFields.blogCategory.slug));
  const description = getOptionalString(formData, adminFormFields.blogCategory.description);
  const sortOrder = parseSortOrder(formData);

  if (!name) {
    done("error", "Въведете име на блог категорията.");
  }
  if (!slug || !isValidBlogCategorySlug(slug)) {
    done(
      "error",
      "Slug трябва да съдържа само малки латински букви, цифри и тирета.",
    );
  }
  if (sortOrder === null) {
    done("error", "Подредбата трябва да бъде цяло число.");
  }

  const { error } = await supabase.from("blog_categories").insert({
    name,
    slug,
    description,
    sort_order: sortOrder,
    is_active: true,
    updated_at: new Date().toISOString(),
  });
  done(
    error ? "error" : "success",
    error ? "Блог категорията не беше добавена." : "Блог категорията е добавена.",
  );
}

export async function updateBlogCategory(formData: FormData) {
  const supabase = await getAuthorizedClient();
  const id = getString(formData, adminFormFields.blogCategory.id);
  const name = getString(formData, adminFormFields.blogCategory.name);
  const slug = normalizeSlug(getString(formData, adminFormFields.blogCategory.slug));
  const description = getOptionalString(formData, adminFormFields.blogCategory.description);
  const sortOrder = parseSortOrder(formData);
  const isActive = isChecked(formData, adminFormFields.blogCategory.isActive);

  if (!id || !name) {
    done("error", "Невалидни данни за блог категорията.");
  }
  if (!slug || !isValidBlogCategorySlug(slug)) {
    done(
      "error",
      "Slug трябва да съдържа само малки латински букви, цифри и тирета.",
    );
  }
  if (sortOrder === null) {
    done("error", "Подредбата трябва да бъде цяло число.");
  }

  const { error } = await supabase
    .from("blog_categories")
    .update({
      name,
      slug,
      description,
      sort_order: sortOrder,
      is_active: isActive,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (!error) {
    await supabase
      .from("blog_posts")
      .update({ category: name, updated_at: new Date().toISOString() })
      .eq("blog_category_id", id);
  }

  done(
    error ? "error" : "success",
    error ? "Блог категорията не беше обновена." : "Блог категорията е обновена.",
  );
}

export async function deactivateBlogCategory(formData: FormData) {
  const supabase = await getAuthorizedClient();
  const id = getString(formData, adminFormFields.blogCategory.id);
  if (!id) {
    done("error", "Липсва блог категория за деактивиране.");
  }

  const { error } = await supabase
    .from("blog_categories")
    .update({
      is_active: false,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
  done(
    error ? "error" : "success",
    error ? "Блог категорията не беше деактивирана." : "Блог категорията е деактивирана.",
  );
}
