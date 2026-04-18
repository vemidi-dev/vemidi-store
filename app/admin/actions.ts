"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { checkIsAdmin } from "@/lib/supabase/admin-auth";
import { createClient } from "@/lib/supabase/server";

const ADMIN_PATH = "/admin";
const ADMIN_LOGIN_PATH = "/admin/login";
const IMAGE_BUCKET = "product-images";
type AdminTab = "products" | "categories";

function getString(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function getOptionalString(formData: FormData, key: string) {
  const value = getString(formData, key);
  return value || null;
}

function getPrice(formData: FormData) {
  const raw = getString(formData, "price");
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return null;
  }
  return parsed;
}

function toChecked(formData: FormData, key: string) {
  return formData.get(key) === "on";
}

function getFile(formData: FormData, key: string): File | null {
  const value = formData.get(key);
  if (!(value instanceof File) || value.size === 0) {
    return null;
  }
  return value;
}

function getCategoryIds(formData: FormData) {
  return Array.from(
    new Set(
      formData
        .getAll("category_ids")
        .map((value) => String(value ?? "").trim())
        .filter(Boolean),
    ),
  );
}

type ColorGroupRow = {
  id: string;
  label: string;
};

type ColorOptionRow = {
  id: string;
  group_id: string;
  is_active: boolean;
};

type ParsedColorField = {
  label: string;
  groupId: string;
  minSelect: number;
  maxSelect: number;
  optionIds: string[];
  sortOrder: number;
};

type CreateProductDraft = {
  name: string;
  description: string;
  additional_info: string;
  fulfillment_note: string;
  price: string;
  is_customizable: boolean;
  category_ids: string[];
  color_fields: Array<{
    label: string;
    group_id: string;
    min_select: string;
    max_select: string;
    option_ids: string;
  }>;
};

function getFileExtension(fileName: string) {
  const ext = fileName.split(".").pop()?.toLowerCase() ?? "";
  if (!ext || !/^[a-z0-9]+$/.test(ext)) {
    return "bin";
  }
  return ext;
}

function normalizeSlug(raw: string) {
  return raw.trim().toLowerCase();
}

function normalizeTab(raw: string): AdminTab {
  return raw === "categories" ? "categories" : "products";
}

function getTabFromForm(formData: FormData, fallback: AdminTab): AdminTab {
  const raw = getString(formData, "tab");
  return raw ? normalizeTab(raw) : fallback;
}

function parseSelectLimit(value: string, fallback: number) {
  if (!value) {
    return fallback;
  }
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) {
    return null;
  }
  return parsed;
}

function redirectWith(
  kind: "success" | "error",
  message: string,
  tab: AdminTab = "products",
  draft?: string,
): never {
  const params = new URLSearchParams({ [kind]: message, tab });
  if (draft) {
    params.set("draft", draft);
  }
  redirect(`${ADMIN_PATH}?${params.toString()}`);
}

function makeCreateProductDraft(formData: FormData) {
  const labels = formData.getAll("color_field_label[]").map((value) => String(value ?? "").trim());
  const groupIds = formData.getAll("color_field_group_id[]").map((value) => String(value ?? "").trim());
  const mins = formData.getAll("color_field_min_select[]").map((value) => String(value ?? "").trim());
  const maxes = formData.getAll("color_field_max_select[]").map((value) => String(value ?? "").trim());
  const optionIds = formData.getAll("color_field_option_ids[]").map((value) => String(value ?? "").trim());

  const longestLength = Math.max(labels.length, groupIds.length, mins.length, maxes.length, optionIds.length);
  const colorFields = Array.from({ length: longestLength }, (_, index) => ({
    label: labels[index] ?? "",
    group_id: groupIds[index] ?? "",
    min_select: mins[index] ?? "",
    max_select: maxes[index] ?? "",
    option_ids: optionIds[index] ?? "",
  })).filter((field) => field.label || field.group_id || field.option_ids);

  const draft: CreateProductDraft = {
    name: getString(formData, "name"),
    description: getString(formData, "description"),
    additional_info: getString(formData, "additional_info"),
    fulfillment_note: getString(formData, "fulfillment_note"),
    price: getString(formData, "price"),
    is_customizable: toChecked(formData, "is_customizable"),
    category_ids: getCategoryIds(formData),
    color_fields: colorFields,
  };

  return JSON.stringify(draft);
}

async function uploadProductImage(supabase: NonNullable<Awaited<ReturnType<typeof createClient>>>, file: File) {
  const ext = getFileExtension(file.name);
  const path = `products/${Date.now()}-${randomUUID()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from(IMAGE_BUCKET)
    .upload(path, file, { contentType: file.type || undefined, upsert: false });

  if (uploadError) {
    throw new Error(uploadError.message);
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from(IMAGE_BUCKET).getPublicUrl(path);

  return publicUrl;
}

async function parseProductColorFields(
  supabase: NonNullable<Awaited<ReturnType<typeof createClient>>>,
  formData: FormData,
): Promise<{ fields: ParsedColorField[]; error: string | null }> {
  const { data: groupsData } = await supabase.from("color_groups").select("id,label");
  const groups = (groupsData ?? []) as ColorGroupRow[];
  if (groups.length === 0) {
    return { fields: [], error: null };
  }

  const groupIds = groups.map((group) => group.id);
  const { data: optionsData } = await supabase
    .from("color_options")
    .select("id,group_id,is_active")
    .in("group_id", groupIds)
    .eq("is_active", true);
  const options = (optionsData ?? []) as ColorOptionRow[];
  const validOptionIdsByGroup = new Map<string, Set<string>>();

  options.forEach((option) => {
    const set = validOptionIdsByGroup.get(option.group_id) ?? new Set<string>();
    set.add(option.id);
    validOptionIdsByGroup.set(option.group_id, set);
  });

  const labels = formData.getAll("color_field_label[]").map((value) => String(value ?? "").trim());
  const formGroupIds = formData
    .getAll("color_field_group_id[]")
    .map((value) => String(value ?? "").trim());
  const mins = formData.getAll("color_field_min_select[]").map((value) => String(value ?? "").trim());
  const maxes = formData.getAll("color_field_max_select[]").map((value) => String(value ?? "").trim());
  const optionCsvs = formData
    .getAll("color_field_option_ids[]")
    .map((value) => String(value ?? "").trim());

  const parsedFields: ParsedColorField[] = [];

  for (let index = 0; index < labels.length; index += 1) {
    const label = labels[index] ?? "";
    const groupId = formGroupIds[index] ?? "";
    const minRaw = mins[index] ?? "";
    const maxRaw = maxes[index] ?? "";
    const optionCsv = optionCsvs[index] ?? "";

    if (!label && !groupId && !optionCsv) {
      continue;
    }
    if (!label || !groupId) {
      return { fields: [], error: "Всяко цветово поле трябва да има лейбъл и категория." };
    }

    const groupExists = groups.some((group) => group.id === groupId);
    if (!groupExists) {
      return { fields: [], error: "Избрана е невалидна категория за цветово поле." };
    }

    const minSelect = parseSelectLimit(minRaw, 0);
    const maxSelect = parseSelectLimit(maxRaw, 1);

    if (minSelect === null || maxSelect === null || maxSelect < 1 || minSelect > maxSelect) {
      return { fields: [], error: "Невалиден брой избори за цветове (min/max)." };
    }

    const optionIds = Array.from(
      new Set(
        optionCsv
          .split(",")
          .map((value) => value.trim())
          .filter(Boolean),
      ),
    );

    if (optionIds.length === 0) {
      return { fields: [], error: "Изберете поне един разрешен цвят за всяко цветово поле." };
    }
    if (optionIds.length < minSelect || optionIds.length < maxSelect) {
      return {
        fields: [],
        error: "Броят позволени цветове е по-малък от зададените min/max ограничения.",
      };
    }

    const validForGroup = validOptionIdsByGroup.get(groupId) ?? new Set<string>();
    if (optionIds.some((optionId) => !validForGroup.has(optionId))) {
      return { fields: [], error: "Невалиден избор на цветове за група." };
    }

    parsedFields.push({
      label,
      groupId,
      minSelect,
      maxSelect,
      optionIds,
      sortOrder: index,
    });
  }

  return { fields: parsedFields, error: null };
}

async function saveProductColorFields(
  supabase: NonNullable<Awaited<ReturnType<typeof createClient>>>,
  productId: string,
  fields: ParsedColorField[],
) {
  const { data: existingFields } = await supabase
    .from("product_color_fields")
    .select("id")
    .eq("product_id", productId);

  const existingFieldIds = (existingFields ?? []).map((field) => field.id);
  if (existingFieldIds.length > 0) {
    await supabase.from("product_color_field_options").delete().in("field_id", existingFieldIds);
  }
  await supabase.from("product_color_fields").delete().eq("product_id", productId);

  if (fields.length === 0) {
    return;
  }

  const { data: insertedFields, error: fieldsError } = await supabase
    .from("product_color_fields")
    .insert(
      fields.map((field) => ({
        product_id: productId,
        group_id: field.groupId,
        label: field.label,
        min_select: field.minSelect,
        max_select: field.maxSelect,
        sort_order: field.sortOrder,
        enabled: true,
      })),
    )
    .select("id");

  if (fieldsError || !insertedFields) {
    throw new Error(`Грешка при запис на цветови полета: ${fieldsError?.message ?? "непозната грешка"}`);
  }

  const optionRows = insertedFields.flatMap((insertedField, index) =>
    fields[index].optionIds.map((optionId) => ({
      field_id: insertedField.id,
      color_option_id: optionId,
    })),
  );

  if (optionRows.length === 0) {
    return;
  }

  const { error: optionError } = await supabase.from("product_color_field_options").insert(optionRows);
  if (optionError) {
    throw new Error(`Грешка при запис на цветови опции: ${optionError.message}`);
  }
}


async function getAuthorizedClient() {
  const supabase = await createClient();
  if (!supabase) {
    redirect(`${ADMIN_LOGIN_PATH}?message=${encodeURIComponent("Supabase не е конфигуриран.")}`);
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`${ADMIN_LOGIN_PATH}?message=${encodeURIComponent("Моля, влезте като администратор.")}`);
  }

  const { isAdmin, error } = await checkIsAdmin(supabase, user.id);
  if (error) {
    redirectWith(
      "error",
      "Липсва admin_users таблица или достъп. Изпълнете SQL скрипта за админи в Supabase.",
    );
  }
  if (!isAdmin) {
    redirect(`${ADMIN_LOGIN_PATH}?message=${encodeURIComponent("Профилът няма админ права.")}`);
  }

  return supabase;
}

export async function createProduct(formData: FormData) {
  const supabase = await getAuthorizedClient();
  const activeTab = getTabFromForm(formData, "products");
  const draft = makeCreateProductDraft(formData);

  const name = getString(formData, "name");
  const description = getString(formData, "description");
  const additionalInfo = getOptionalString(formData, "additional_info");
  const fulfillmentNote = getOptionalString(formData, "fulfillment_note");
  const isCustomizable = toChecked(formData, "is_customizable");
  const imageFile = getFile(formData, "image_file");
  const price = getPrice(formData);
  const categoryIds = getCategoryIds(formData);
  const { fields: colorFields, error: colorFieldsError } = await parseProductColorFields(
    supabase,
    formData,
  );

  if (!name || !description || price === null || categoryIds.length === 0) {
    redirectWith(
      "error",
      "Попълнете име, описание, валидна цена и изберете поне една категория.",
      activeTab,
      draft,
    );
  }
  if (colorFieldsError) {
    redirectWith("error", colorFieldsError, activeTab, draft);
  }

  let imageUrl: string | null = null;
  if (imageFile) {
    try {
      imageUrl = await uploadProductImage(supabase, imageFile);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Неуспешно качване на изображението.";
      redirectWith("error", `Грешка при качване на изображение: ${message}`, activeTab, draft);
    }
  }

  const { data: insertedProduct, error } = await supabase
    .from("products")
    .insert({
      name,
      description,
      additional_info: additionalInfo,
      fulfillment_note: fulfillmentNote,
      price,
      image_url: imageUrl,
      is_customizable: isCustomizable,
    })
    .select("id")
    .single();

  if (error || !insertedProduct) {
    redirectWith(
      "error",
      `Грешка при добавяне: ${error?.message ?? "неуспешна операция"}`,
      activeTab,
      draft,
    );
  }

  const { error: categoriesError } = await supabase.from("product_categories").insert(
    categoryIds.map((categoryId) => ({
      product_id: insertedProduct.id,
      category_id: categoryId,
    })),
  );

  if (categoriesError) {
    await supabase.from("products").delete().eq("id", insertedProduct.id);
    redirectWith("error", `Грешка при добавяне на категории: ${categoriesError.message}`, activeTab, draft);
  }

  try {
    await saveProductColorFields(supabase, insertedProduct.id, colorFields);
  } catch (error) {
    await supabase.from("products").delete().eq("id", insertedProduct.id);
    const message = error instanceof Error ? error.message : "Грешка при запис на цветови правила.";
    redirectWith("error", message, activeTab, draft);
  }

  revalidatePath(ADMIN_PATH);
  redirectWith("success", "Продуктът е добавен.", activeTab);
}

export async function updateProduct(formData: FormData) {
  const supabase = await getAuthorizedClient();
  const activeTab = getTabFromForm(formData, "products");

  const id = getString(formData, "id");
  const name = getString(formData, "name");
  const description = getString(formData, "description");
  const additionalInfo = getOptionalString(formData, "additional_info");
  const fulfillmentNote = getOptionalString(formData, "fulfillment_note");
  const existingImageUrl = getString(formData, "existing_image_url") || null;
  const imageFile = getFile(formData, "image_file");
  const categoryIds = getCategoryIds(formData);
  const isCustomizable = toChecked(formData, "is_customizable");
  const price = getPrice(formData);
  const { fields: colorFields, error: colorFieldsError } = await parseProductColorFields(
    supabase,
    formData,
  );

  if (!id || !name || !description || price === null || categoryIds.length === 0) {
    redirectWith("error", "Невалидни данни за редакция.", activeTab);
  }
  if (colorFieldsError) {
    redirectWith("error", colorFieldsError, activeTab);
  }

  let imageUrl = existingImageUrl;
  if (imageFile) {
    try {
      imageUrl = await uploadProductImage(supabase, imageFile);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Неуспешно качване на изображението.";
      redirectWith("error", `Грешка при качване на изображение: ${message}`, activeTab);
    }
  }

  const { error } = await supabase
    .from("products")
    .update({
      name,
      description,
      additional_info: additionalInfo,
      fulfillment_note: fulfillmentNote,
      price,
      image_url: imageUrl || null,
      is_customizable: isCustomizable,
    })
    .eq("id", id);

  if (error) {
    redirectWith("error", `Грешка при редакция: ${error.message}`, activeTab);
  }

  const { error: deleteCategoriesError } = await supabase
    .from("product_categories")
    .delete()
    .eq("product_id", id);

  if (deleteCategoriesError) {
    redirectWith("error", `Грешка при обновяване на категориите: ${deleteCategoriesError.message}`, activeTab);
  }

  const { error: categoriesError } = await supabase.from("product_categories").insert(
    categoryIds.map((categoryId) => ({
      product_id: id,
      category_id: categoryId,
    })),
  );

  if (categoriesError) {
    redirectWith("error", `Грешка при запис на категориите: ${categoriesError.message}`, activeTab);
  }

  try {
    await saveProductColorFields(supabase, id, colorFields);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Грешка при запис на цветови правила.";
    redirectWith("error", message, activeTab);
  }

  revalidatePath(ADMIN_PATH);
  redirectWith("success", "Продуктът е обновен.", activeTab);
}

export async function deleteProduct(formData: FormData) {
  const supabase = await getAuthorizedClient();
  const activeTab = getTabFromForm(formData, "products");
  const id = getString(formData, "id");

  if (!id) {
    redirectWith("error", "Липсва id за изтриване.", activeTab);
  }

  const { error: relationError } = await supabase
    .from("product_categories")
    .delete()
    .eq("product_id", id);
  if (relationError) {
    redirectWith("error", `Грешка при изтриване на категории: ${relationError.message}`, activeTab);
  }

  const { data: existingFields } = await supabase
    .from("product_color_fields")
    .select("id")
    .eq("product_id", id);
  const fieldIds = (existingFields ?? []).map((field) => field.id);
  if (fieldIds.length > 0) {
    await supabase.from("product_color_field_options").delete().in("field_id", fieldIds);
  }
  await supabase.from("product_color_fields").delete().eq("product_id", id);

  const { error } = await supabase.from("products").delete().eq("id", id);

  if (error) {
    redirectWith("error", `Грешка при изтриване: ${error.message}`, activeTab);
  }

  revalidatePath(ADMIN_PATH);
  redirectWith("success", "Продуктът е изтрит.", activeTab);
}

export async function createCategory(formData: FormData) {
  const supabase = await getAuthorizedClient();
  const activeTab = getTabFromForm(formData, "categories");
  const name = getString(formData, "name");
  const slug = normalizeSlug(getString(formData, "slug"));

  if (!name || !slug) {
    redirectWith("error", "Попълнете име и slug за категорията.", activeTab);
  }

  const { error } = await supabase.from("categories").insert({ name, slug });
  if (error) {
    redirectWith("error", `Грешка при добавяне на категория: ${error.message}`, activeTab);
  }

  revalidatePath(ADMIN_PATH);
  redirectWith("success", "Категорията е добавена.", activeTab);
}

export async function updateCategory(formData: FormData) {
  const supabase = await getAuthorizedClient();
  const activeTab = getTabFromForm(formData, "categories");
  const id = getString(formData, "id");
  const name = getString(formData, "name");
  const slug = normalizeSlug(getString(formData, "slug"));

  if (!id || !name || !slug) {
    redirectWith("error", "Невалидни данни за категория.", activeTab);
  }

  const { error } = await supabase.from("categories").update({ name, slug }).eq("id", id);
  if (error) {
    redirectWith("error", `Грешка при редакция на категория: ${error.message}`, activeTab);
  }

  revalidatePath(ADMIN_PATH);
  redirectWith("success", "Категорията е обновена.", activeTab);
}

export async function deleteCategory(formData: FormData) {
  const supabase = await getAuthorizedClient();
  const activeTab = getTabFromForm(formData, "categories");
  const id = getString(formData, "id");

  if (!id) {
    redirectWith("error", "Липсва категория за изтриване.", activeTab);
  }

  const { error } = await supabase.from("categories").delete().eq("id", id);
  if (error) {
    redirectWith("error", `Грешка при изтриване на категория: ${error.message}`, activeTab);
  }

  revalidatePath(ADMIN_PATH);
  redirectWith("success", "Категорията е изтрита.", activeTab);
}
