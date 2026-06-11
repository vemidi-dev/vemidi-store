"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  getAdminTab,
  getCategoryIds,
  getFiles,
  getOptionalString,
  getPrice,
  getString,
  getWishTemplateIds,
  isChecked,
  makeCreateProductDraft,
  normalizeSlug,
  parseSelectLimit,
} from "@/lib/admin/form-data";
import { adminFormFields } from "@/lib/admin/form-fields";
import { normalizeProductCardBadge } from "@/lib/product-card";
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
  ParsedPersonalizationField,
} from "@/lib/admin/types";
import { checkIsAdmin } from "@/lib/supabase/admin-auth";
import { createClient } from "@/lib/supabase/server";

const ADMIN_PATH = "/admin";
const ADMIN_LOGIN_PATH = "/admin/login";
const MAX_GALLERY_FILES_PER_UPLOAD = 8;
const MAX_GALLERY_UPLOAD_BYTES = 9 * 1024 * 1024;

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

function revalidateCategoryPaths() {
  revalidatePath(ADMIN_PATH);
  revalidatePath("/");
  revalidatePath("/categories");
  revalidatePath("/occasions");
  revalidatePath("/shop");
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

async function deleteImagesBestEffort(
  supabase: NonNullable<Awaited<ReturnType<typeof createClient>>>,
  images: UploadedProductImage[],
) {
  await Promise.all(
    images.map((image) => deleteImageBestEffort(supabase, image.path)),
  );
}

async function uploadProductImages(
  supabase: NonNullable<Awaited<ReturnType<typeof createClient>>>,
  files: File[],
) {
  const uploaded: UploadedProductImage[] = [];

  try {
    for (const file of files) {
      uploaded.push(await uploadProductImage(supabase, file));
    }
    return uploaded;
  } catch (error) {
    await deleteImagesBestEffort(supabase, uploaded);
    throw error;
  }
}

async function attachProductImages(
  supabase: NonNullable<Awaited<ReturnType<typeof createClient>>>,
  productId: string,
  productName: string,
  images: UploadedProductImage[],
) {
  if (images.length === 0) {
    return null;
  }

  const { error } = await supabase.rpc("admin_attach_product_images", {
    p_product_id: productId,
    p_images: images.map((image) => ({
      image_url: image.url,
      alt_text: productName,
    })),
  });
  return error;
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

  const labels = formData.getAll(adminFormFields.colorField.labels).map((value) => String(value ?? "").trim());
  const formGroupIds = formData
    .getAll(adminFormFields.colorField.groupIds)
    .map((value) => String(value ?? "").trim());
  const mins = formData.getAll(adminFormFields.colorField.minSelects).map((value) => String(value ?? "").trim());
  const maxes = formData.getAll(adminFormFields.colorField.maxSelects).map((value) => String(value ?? "").trim());
  const optionCsvs = formData
    .getAll(adminFormFields.colorField.optionIds)
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
      return { fields: [], error: "Всеки избор на цвят трябва да има име и палитра." };
    }

    const groupExists = groups.some((group) => group.id === groupId);
    if (!groupExists) {
      return { fields: [], error: "Избрана е невалидна цветова палитра." };
    }

    const minSelect = parseSelectLimit(minRaw, 0);
    const maxSelect = parseSelectLimit(maxRaw, 1);

    if (minSelect === null || maxSelect === null || maxSelect < 1 || minSelect > maxSelect) {
      return { fields: [], error: "Настройката за броя избирани цветове е невалидна." };
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
        error: "Изберете достатъчно налични цветове за зададения брой клиентски избори.",
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

function parseProductPersonalizationFields(
  formData: FormData,
): { fields: ParsedPersonalizationField[]; error: string | null } {
  const labels = formData
    .getAll(adminFormFields.personalizationField.labels)
    .map((value) => String(value ?? "").trim());
  const keys = formData
    .getAll(adminFormFields.personalizationField.keys)
    .map((value) => String(value ?? "").trim());
  const types = formData
    .getAll(adminFormFields.personalizationField.types)
    .map((value) => String(value ?? "").trim());
  const placeholders = formData
    .getAll(adminFormFields.personalizationField.placeholders)
    .map((value) => String(value ?? "").trim());
  const maxLengths = formData
    .getAll(adminFormFields.personalizationField.maxLengths)
    .map((value) => Number(String(value ?? "").trim()));
  const required = formData
    .getAll(adminFormFields.personalizationField.required)
    .map((value) => String(value) === "1");
  const allowsWishes = formData
    .getAll(adminFormFields.personalizationField.allowsWishes)
    .map((value) => String(value) === "1");

  if (labels.length > 20) {
    return {
      fields: [],
      error: "Един продукт може да има най-много 20 полета за персонализация.",
    };
  }

  const fields: ParsedPersonalizationField[] = [];
  const usedKeys = new Set<string>();

  for (let index = 0; index < labels.length; index += 1) {
    const label = labels[index] ?? "";
    const key = keys[index] ?? "";
    const type = types[index] ?? "";
    const maxLength = type === "date" ? 10 : maxLengths[index];

    if (
      !label ||
      !/^[a-z][a-z0-9_]{0,63}$/.test(key) ||
      !["text", "textarea", "date"].includes(type) ||
      !Number.isInteger(maxLength) ||
      maxLength < 1 ||
      maxLength > 1000 ||
      usedKeys.has(key)
    ) {
      return {
        fields: [],
        error: `Проверете настройките на поле за персонализация #${index + 1}.`,
      };
    }

    usedKeys.add(key);
    fields.push({
      label,
      key,
      type: type as ParsedPersonalizationField["type"],
      placeholder: placeholders[index] ?? "",
      maxLength,
      required: required[index] ?? false,
      allowsWishTemplates:
        type === "textarea" && (allowsWishes[index] ?? false),
      sortOrder: index,
    });
  }

  return { fields, error: null };
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

  const name = getString(formData, adminFormFields.product.name);
  const description = getString(formData, adminFormFields.product.description);
  const additionalInfo = getOptionalString(formData, adminFormFields.product.additionalInfo);
  const fulfillmentNote = getOptionalString(formData, adminFormFields.product.fulfillmentNote);
  const isCustomizable = isChecked(formData, adminFormFields.product.isCustomizable);
  const isSoldOut = isChecked(formData, adminFormFields.product.isSoldOut);
  const cardBadge = normalizeProductCardBadge(
    getOptionalString(formData, adminFormFields.product.cardBadge),
  );
  const imageFiles = getFiles(formData, adminFormFields.product.imageFiles);
  const galleryUploadError = getGalleryUploadError(imageFiles);
  const price = getPrice(formData);
  const categoryIds = getCategoryIds(formData);
  const wishTemplateIds = getWishTemplateIds(formData);
  const { fields: colorFields, error: colorFieldsError } = await parseProductColorFields(
    supabase,
    formData,
  );
  const {
    fields: personalizationFields,
    error: personalizationFieldsError,
  } = parseProductPersonalizationFields(formData);

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
  if (personalizationFieldsError) {
    redirectWith("error", personalizationFieldsError, activeTab, draft);
  }

  let uploadedImages: UploadedProductImage[] = [];
  if (imageFiles.length > 0) {
    try {
      uploadedImages = await uploadProductImages(supabase, imageFiles);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Неуспешно качване на изображението.";
      redirectWith("error", `Грешка при качване на изображение: ${message}`, activeTab, draft);
    }
  }
  if (galleryUploadError) {
    redirectWith("error", galleryUploadError, activeTab, draft);
  }

  const { data: productId, error: mutationError } = await createProductAtomic(supabase, {
    name,
    description,
    additionalInfo,
    fulfillmentNote,
    price,
    imageUrl: uploadedImages[0]?.url ?? null,
    isCustomizable: isCustomizable || personalizationFields.length > 0,
    isSoldOut,
    cardBadge,
    categoryIds,
    colorFields,
    personalizationFields,
    wishTemplateIds,
  });

  if (mutationError || !productId) {
    await deleteImagesBestEffort(supabase, uploadedImages);
    redirectWith(
      "error",
      getProductMutationErrorMessage(mutationError),
      activeTab,
      draft,
    );
  }

  const galleryError = await attachProductImages(
    supabase,
    String(productId),
    name,
    uploadedImages,
  );
  if (galleryError) {
    await deleteProductAtomic(supabase, String(productId));
    await deleteImagesBestEffort(supabase, uploadedImages);
    redirectWith(
      "error",
      "Продуктът не беше добавен, защото галерията не можа да бъде записана. Изпълнете product_image_gallery.sql.",
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

  const id = getString(formData, adminFormFields.common.id);
  const name = getString(formData, adminFormFields.product.name);
  const description = getString(formData, adminFormFields.product.description);
  const additionalInfo = getOptionalString(formData, adminFormFields.product.additionalInfo);
  const fulfillmentNote = getOptionalString(formData, adminFormFields.product.fulfillmentNote);
  const existingImageUrl = getString(formData, adminFormFields.product.existingImageUrl) || null;
  const imageFiles = getFiles(formData, adminFormFields.product.imageFiles);
  const galleryUploadError = getGalleryUploadError(imageFiles);
  const categoryIds = getCategoryIds(formData);
  const wishTemplateIds = getWishTemplateIds(formData);
  const isCustomizable = isChecked(formData, adminFormFields.product.isCustomizable);
  const isSoldOut = isChecked(formData, adminFormFields.product.isSoldOut);
  const cardBadge = normalizeProductCardBadge(
    getOptionalString(formData, adminFormFields.product.cardBadge),
  );
  const price = getPrice(formData);
  const { fields: colorFields, error: colorFieldsError } = await parseProductColorFields(
    supabase,
    formData,
  );
  const {
    fields: personalizationFields,
    error: personalizationFieldsError,
  } = parseProductPersonalizationFields(formData);

  if (!id || !name || !description || price === null || categoryIds.length === 0) {
    redirectWith("error", "Невалидни данни за редакция.", activeTab);
  }
  if (colorFieldsError) {
    redirectWith("error", colorFieldsError, activeTab);
  }
  if (personalizationFieldsError) {
    redirectWith("error", personalizationFieldsError, activeTab);
  }

  let uploadedImages: UploadedProductImage[] = [];
  if (imageFiles.length > 0) {
    try {
      uploadedImages = await uploadProductImages(supabase, imageFiles);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Неуспешно качване на изображението.";
      redirectWith("error", `Грешка при качване на изображение: ${message}`, activeTab);
    }
  }
  if (galleryUploadError) {
    redirectWith("error", galleryUploadError, activeTab);
  }

  const { error: mutationError } = await updateProductAtomic(
    supabase,
    id,
    {
      name,
      description,
      additionalInfo,
      fulfillmentNote,
      price,
      imageUrl: existingImageUrl,
      isCustomizable: isCustomizable || personalizationFields.length > 0,
      isSoldOut,
      cardBadge,
      categoryIds,
      colorFields,
      personalizationFields,
      wishTemplateIds,
    },
  );

  if (mutationError) {
    await deleteImagesBestEffort(supabase, uploadedImages);
    redirectWith(
      "error",
      getProductMutationErrorMessage(mutationError),
      activeTab,
    );
  }

  const galleryError = await attachProductImages(
    supabase,
    id,
    name,
    uploadedImages,
  );
  if (galleryError) {
    await deleteImagesBestEffort(supabase, uploadedImages);
    redirectWith(
      "error",
      "Промените са запазени, но новите снимки не бяха добавени. Изпълнете product_image_gallery.sql.",
      activeTab,
    );
  }

  revalidateProductPaths(id);
  redirectWith("success", "Продуктът е обновен.", activeTab);
}

export async function deleteProduct(formData: FormData) {
  const supabase = await getAuthorizedClient();
  const activeTab = getAdminTab(formData, "products");
  const id = getString(formData, adminFormFields.common.id);

  if (!id) {
    redirectWith("error", "Липсва id за изтриване.", activeTab);
  }

  const { data: galleryRows } = await supabase
    .from("product_images")
    .select("image_url")
    .eq("product_id", id);
  const { data: imageUrl, error: mutationError } = await deleteProductAtomic(supabase, id);
  if (mutationError) {
    redirectWith(
      "error",
      getProductMutationErrorMessage(mutationError),
      activeTab,
    );
  }

  const imageUrls = new Set(
    [
      ...(galleryRows ?? []).map((row) => String(row.image_url)),
      typeof imageUrl === "string" ? imageUrl : "",
    ].filter(Boolean),
  );
  await Promise.all(
    [...imageUrls].map((url) =>
      deleteImageBestEffort(supabase, getProductImagePath(url)),
    ),
  );
  revalidateProductPaths(id);
  redirectWith("success", "Продуктът е изтрит.", activeTab);
}

export async function setPrimaryProductImage(formData: FormData) {
  const supabase = await getAuthorizedClient();
  const imageId = getString(formData, adminFormFields.productImage.imageId);
  if (!imageId) {
    redirectWith("error", "Липсва снимка.", "products");
  }

  const { data: image } = await supabase
    .from("product_images")
    .select("product_id")
    .eq("id", imageId)
    .single();
  const { error } = await supabase.rpc("admin_set_primary_product_image", {
    p_image_id: imageId,
  });
  if (error) {
    redirectWith("error", "Основната снимка не беше променена.", "products");
  }

  revalidateProductPaths(image?.product_id ? String(image.product_id) : undefined);
  redirectWith("success", "Основната снимка е променена.", "products");
}

export async function moveProductImage(formData: FormData) {
  const supabase = await getAuthorizedClient();
  const imageId = getString(formData, adminFormFields.productImage.imageId);
  const direction = getString(formData, adminFormFields.productImage.direction);
  if (!imageId || !["up", "down"].includes(direction)) {
    redirectWith("error", "Невалидна заявка за преместване.", "products");
  }

  const { data: image } = await supabase
    .from("product_images")
    .select("product_id")
    .eq("id", imageId)
    .single();
  const { data: moved, error } = await supabase.rpc("admin_move_product_image", {
    p_image_id: imageId,
    p_direction: direction,
  });
  if (error) {
    redirectWith("error", "Снимката не беше преместена.", "products");
  }
  if (moved !== true) {
    redirectWith("success", "Снимката вече е в края на галерията.", "products");
  }

  revalidateProductPaths(image?.product_id ? String(image.product_id) : undefined);
  redirectWith("success", "Редът на снимките е променен.", "products");
}

export async function deleteProductGalleryImage(formData: FormData) {
  const supabase = await getAuthorizedClient();
  const imageId = getString(formData, adminFormFields.productImage.imageId);
  if (!imageId) {
    redirectWith("error", "Липсва снимка за изтриване.", "products");
  }

  const { data, error } = await supabase.rpc(
    "admin_delete_product_gallery_image",
    { p_image_id: imageId },
  );
  if (error || !data || typeof data !== "object") {
    redirectWith("error", "Снимката не беше изтрита.", "products");
  }

  const result = data as { product_id?: unknown; image_url?: unknown };
  await deleteImageBestEffort(
    supabase,
    getProductImagePath(
      typeof result.image_url === "string" ? result.image_url : null,
    ),
  );
  revalidateProductPaths(
    typeof result.product_id === "string" ? result.product_id : undefined,
  );
  redirectWith("success", "Снимката е изтрита.", "products");
}

export async function createCategory(formData: FormData) {
  const supabase = await getAuthorizedClient();
  const activeTab = getAdminTab(formData, "categories");
  const name = getString(formData, adminFormFields.category.name);
  const slug = normalizeSlug(getString(formData, adminFormFields.category.slug));
  const categoryType = getString(formData, adminFormFields.category.type);
  const showOnHome = isChecked(formData, adminFormFields.category.showOnHome);
  const cardDescription =
    getString(formData, adminFormFields.category.cardDescription).trim() || null;

  if (!name || !slug || !["product", "occasion"].includes(categoryType)) {
    redirectWith("error", "Попълнете име и slug за категорията.", activeTab);
  }

  const { data: lastCategory } = await supabase
    .from("categories")
    .select("home_sort_order")
    .eq("category_type", categoryType)
    .order("home_sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  const homeSortOrder = (Number(lastCategory?.home_sort_order) || 0) + 10;

  const { error } = await supabase
    .from("categories")
    .insert({
      name,
      slug,
      category_type: categoryType,
      show_on_home: showOnHome,
      home_sort_order: homeSortOrder,
      card_description: cardDescription,
    });
  if (error) {
    redirectWith("error", `Грешка при добавяне на категория: ${error.message}`, activeTab);
  }

  revalidateCategoryPaths();
  redirectWith("success", "Категорията е добавена.", activeTab);
}

export async function updateCategory(formData: FormData) {
  const supabase = await getAuthorizedClient();
  const activeTab = getAdminTab(formData, "categories");
  const id = getString(formData, adminFormFields.common.id);
  const name = getString(formData, adminFormFields.category.name);
  const slug = normalizeSlug(getString(formData, adminFormFields.category.slug));
  const categoryType = getString(formData, adminFormFields.category.type);
  const showOnHome = isChecked(formData, adminFormFields.category.showOnHome);
  const cardDescription =
    getString(formData, adminFormFields.category.cardDescription).trim() || null;

  if (!id || !name || !slug || !["product", "occasion"].includes(categoryType)) {
    redirectWith("error", "Невалидни данни за категория.", activeTab);
  }

  const { data: existingCategory, error: existingCategoryError } = await supabase
    .from("categories")
    .select("category_type,home_sort_order")
    .eq("id", id)
    .single();
  if (existingCategoryError || !existingCategory) {
    redirectWith("error", "Категорията не беше намерена.", activeTab);
  }

  let homeSortOrder = existingCategory.home_sort_order;
  if (existingCategory.category_type !== categoryType) {
    const { data: lastCategory } = await supabase
      .from("categories")
      .select("home_sort_order")
      .eq("category_type", categoryType)
      .order("home_sort_order", { ascending: false })
      .limit(1)
      .maybeSingle();
    homeSortOrder = (Number(lastCategory?.home_sort_order) || 0) + 10;
  }

  const { error } = await supabase
    .from("categories")
    .update({
      name,
      slug,
      category_type: categoryType,
      show_on_home: showOnHome,
      home_sort_order: homeSortOrder,
      card_description: cardDescription,
    })
    .eq("id", id);
  if (error) {
    redirectWith("error", `Грешка при редакция на категория: ${error.message}`, activeTab);
  }

  revalidateCategoryPaths();
  redirectWith("success", "Категорията е обновена.", activeTab);
}

export async function moveCategory(formData: FormData) {
  const supabase = await getAuthorizedClient();
  const activeTab = getAdminTab(formData, "categories");
  const id = getString(formData, adminFormFields.common.id);
  const direction = getString(formData, adminFormFields.category.direction);

  if (!id || !["up", "down"].includes(direction)) {
    redirectWith("error", "Невалидна заявка за преместване.", activeTab);
  }

  const { data: moved, error } = await supabase.rpc("admin_move_home_category", {
    p_category_id: id,
    p_direction: direction,
  });
  if (error) {
    redirectWith("error", "Позицията не беше променена.", activeTab);
  }
  if (moved !== true) {
    redirectWith("success", "Категорията вече е в края на списъка.", activeTab);
  }

  revalidateCategoryPaths();
  redirectWith("success", "Позицията е променена.", activeTab);
}

export async function deleteCategory(formData: FormData) {
  const supabase = await getAuthorizedClient();
  const activeTab = getAdminTab(formData, "categories");
  const id = getString(formData, adminFormFields.common.id);

  if (!id) {
    redirectWith("error", "Липсва категория за изтриване.", activeTab);
  }

  const { error } = await supabase.from("categories").delete().eq("id", id);
  if (error) {
    redirectWith("error", `Грешка при изтриване на категория: ${error.message}`, activeTab);
  }

  revalidateCategoryPaths();
  redirectWith("success", "Категорията е изтрита.", activeTab);
}
