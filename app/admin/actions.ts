"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  getAdminTab,
  getCategoryIds,
  getFile,
  getOptionalString,
  getPrice,
  getString,
  isChecked,
  makeCreateProductDraft,
  normalizeSlug,
  parseSelectLimit,
} from "@/lib/admin/form-data";
import {
  createProductAtomic,
  deleteProductAtomic,
  getProductMutationErrorMessage,
  updateProductAtomic,
} from "@/lib/admin/product-rpc";
import {
  deleteProductImage,
  getProductImagePath,
  uploadProductImage,
  type UploadedProductImage,
} from "@/lib/admin/storage";
import type {
  AdminTab,
  ColorGroupRow,
  ColorOptionRow,
  ParsedColorField,
} from "@/lib/admin/types";
import { checkIsAdmin } from "@/lib/supabase/admin-auth";
import { createClient } from "@/lib/supabase/server";

const ADMIN_PATH = "/admin";
const ADMIN_LOGIN_PATH = "/admin/login";

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

function revalidateProductPaths(productId?: string) {
  revalidatePath(ADMIN_PATH);
  revalidatePath("/");
  revalidatePath("/shop");
  revalidatePath("/products");
  revalidatePath("/categories");
  if (productId) {
    revalidatePath(`/products/${productId}`);
  }
}

async function deleteImageBestEffort(
  supabase: NonNullable<Awaited<ReturnType<typeof createClient>>>,
  path: string | null,
) {
  if (!path) {
    return;
  }

  try {
    await deleteProductImage(supabase, path);
  } catch {
    // Database state is authoritative; stale storage objects can be cleaned up later.
  }
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
  const activeTab = getAdminTab(formData, "products");
  const draft = makeCreateProductDraft(formData);

  const name = getString(formData, "name");
  const description = getString(formData, "description");
  const additionalInfo = getOptionalString(formData, "additional_info");
  const fulfillmentNote = getOptionalString(formData, "fulfillment_note");
  const isCustomizable = isChecked(formData, "is_customizable");
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

  let uploadedImage: UploadedProductImage | null = null;
  if (imageFile) {
    try {
      uploadedImage = await uploadProductImage(supabase, imageFile);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Неуспешно качване на изображението.";
      redirectWith("error", `Грешка при качване на изображение: ${message}`, activeTab, draft);
    }
  }

  const { data: productId, error: mutationError } = await createProductAtomic(supabase, {
    name,
    description,
    additionalInfo,
    fulfillmentNote,
    price,
    imageUrl: uploadedImage?.url ?? null,
    isCustomizable,
    categoryIds,
    colorFields,
  });

  if (mutationError || !productId) {
    await deleteImageBestEffort(supabase, uploadedImage?.path ?? null);
    redirectWith(
      "error",
      getProductMutationErrorMessage(mutationError),
      activeTab,
      draft,
    );
  }

  revalidateProductPaths(String(productId));
  redirectWith("success", "Продуктът е добавен.", activeTab);
}

export async function updateProduct(formData: FormData) {
  const supabase = await getAuthorizedClient();
  const activeTab = getAdminTab(formData, "products");

  const id = getString(formData, "id");
  const name = getString(formData, "name");
  const description = getString(formData, "description");
  const additionalInfo = getOptionalString(formData, "additional_info");
  const fulfillmentNote = getOptionalString(formData, "fulfillment_note");
  const existingImageUrl = getString(formData, "existing_image_url") || null;
  const imageFile = getFile(formData, "image_file");
  const categoryIds = getCategoryIds(formData);
  const isCustomizable = isChecked(formData, "is_customizable");
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

  let uploadedImage: UploadedProductImage | null = null;
  let imageUrl = existingImageUrl;
  if (imageFile) {
    try {
      uploadedImage = await uploadProductImage(supabase, imageFile);
      imageUrl = uploadedImage.url;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Неуспешно качване на изображението.";
      redirectWith("error", `Грешка при качване на изображение: ${message}`, activeTab);
    }
  }

  const { data: previousImageUrl, error: mutationError } = await updateProductAtomic(
    supabase,
    id,
    {
      name,
      description,
      additionalInfo,
      fulfillmentNote,
      price,
      imageUrl,
      isCustomizable,
      categoryIds,
      colorFields,
    },
  );

  if (mutationError) {
    await deleteImageBestEffort(supabase, uploadedImage?.path ?? null);
    redirectWith(
      "error",
      getProductMutationErrorMessage(mutationError),
      activeTab,
    );
  }

  if (uploadedImage && typeof previousImageUrl === "string" && previousImageUrl !== imageUrl) {
    await deleteImageBestEffort(supabase, getProductImagePath(previousImageUrl));
  }

  revalidateProductPaths(id);
  redirectWith("success", "Продуктът е обновен.", activeTab);
}

export async function deleteProduct(formData: FormData) {
  const supabase = await getAuthorizedClient();
  const activeTab = getAdminTab(formData, "products");
  const id = getString(formData, "id");

  if (!id) {
    redirectWith("error", "Липсва id за изтриване.", activeTab);
  }

  const { data: imageUrl, error: mutationError } = await deleteProductAtomic(supabase, id);
  if (mutationError) {
    redirectWith(
      "error",
      getProductMutationErrorMessage(mutationError),
      activeTab,
    );
  }

  await deleteImageBestEffort(
    supabase,
    getProductImagePath(typeof imageUrl === "string" ? imageUrl : null),
  );
  revalidateProductPaths(id);
  redirectWith("success", "Продуктът е изтрит.", activeTab);
}

export async function createCategory(formData: FormData) {
  const supabase = await getAuthorizedClient();
  const activeTab = getAdminTab(formData, "categories");
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
  const activeTab = getAdminTab(formData, "categories");
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
  const activeTab = getAdminTab(formData, "categories");
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
