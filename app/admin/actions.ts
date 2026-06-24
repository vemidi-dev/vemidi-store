"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  createProductAtomic,
  deleteProductAtomic,
  duplicateProductAtomic,
  getProductMutationErrorMessage,
  updateProductAtomic,
} from "@/lib/admin/product-rpc";
import {
  getAdminTab,
  getCategoryIds,
  getFile,
  getFiles,
  getOptionalString,
  getPrice,
  getPrimaryCategoryId,
  getString,
  getWishTemplateIds,
  isChecked,
  makeCreateProductDraft,
  normalizeSlug,
  parseProductFulfillmentFromFormData,
  parseSelectLimit,
} from "@/lib/admin/form-data";
import { parseCategoryContentFromFormData } from "@/lib/admin/category-content";
import { parseProductContentFromFormData } from "@/lib/admin/product-content";
import { adminFormFields } from "@/lib/admin/form-fields";
import { normalizeProductCardBadge } from "@/lib/product-card";
import {
  detectDuplicateOptionWarnings,
  parseProductOptionGroups,
} from "@/lib/admin/parse-option-groups";
import { copyProductGalleryImagesToProduct } from "@/lib/admin/copy-product-gallery";
import {
  buildDuplicateSuccessMessage,
  DUPLICATE_IMAGE_WARNING,
  getDuplicateProductErrorMessage,
  shouldCopyDuplicateImages,
} from "@/lib/admin/duplicate-product";
import {
  createSupabaseProductImageStorageAdapter,
  deleteProductScopedStoragePaths,
  deleteStoragePathsBestEffort,
  getUploadedImagePaths,
  type UploadedProductImage,
} from "@/lib/admin/product-image-storage";
import {
  processAndUploadProductImages,
  validateProductImageUploadBatch,
} from "@/lib/admin/product-image-upload";
import {
  deleteProductImage,
  getProductImagePath,
  uploadAdminImage,
} from "@/lib/admin/storage";
import type {
  AdminTab,
  ColorGroupRow,
  ColorOptionRow,
  ParsedColorField,
  ParsedPersonalizationField,
} from "@/lib/admin/types";
import {
  productSlugErrorMessages,
  slugifyProductName,
  validateProductSlug,
} from "@/lib/product-slug";
import { getProductPath } from "@/lib/product-url";
import { checkIsAdmin } from "@/lib/supabase/admin-auth";
import { createClient } from "@/lib/supabase/server";

const ADMIN_PATH = "/admin";
const ADMIN_LOGIN_PATH = "/admin/login";
const MAX_DRAFT_QUERY_LENGTH = 6000;

function redirectWith(
  kind: "success" | "error",
  message: string,
  tab: AdminTab = "products",
  draft?: string,
): never {
  const params = new URLSearchParams({ [kind]: message, tab });
  if (draft && encodeURIComponent(draft).length <= MAX_DRAFT_QUERY_LENGTH) {
    params.set("draft", draft);
  }
  redirect(`${ADMIN_PATH}?${params.toString()}`);
}

async function revalidateProductPaths(
  supabase: NonNullable<Awaited<ReturnType<typeof createClient>>>,
  productId?: string,
) {
  revalidatePath(ADMIN_PATH);
  revalidatePath("/");
  revalidatePath("/producti");
  revalidatePath("/products");
  revalidatePath("/produkti");
  revalidatePath("/categorii");
  revalidatePath("/categorii");
  revalidatePath("/categorii/[slug]", "page");
  revalidatePath("/categorii/[slug]", "page");

  if (!productId) {
    return;
  }

  const { data } = await supabase
    .from("products")
    .select("slug")
    .eq("id", productId)
    .maybeSingle();

  if (data?.slug) {
    revalidatePath(getProductPath(String(data.slug)));
  }
  revalidatePath(`/products/${productId}`);
}

function parseSubmittedProductSlug(formData: FormData, productName: string) {
  const rawSlug = getString(formData, adminFormFields.product.slug);
  const candidate = rawSlug || slugifyProductName(productName);
  const validated = validateProductSlug(candidate);
  if (!validated.ok) {
    return {
      slug: null,
      error: productSlugErrorMessages[validated.code],
    };
  }
  return { slug: validated.slug, error: null };
}

async function validatePrimaryProductCategory(
  supabase: NonNullable<Awaited<ReturnType<typeof createClient>>>,
  categoryIds: string[],
  primaryCategoryId: string | null,
) {
  if (!primaryCategoryId || !categoryIds.includes(primaryCategoryId)) {
    return false;
  }

  const { data, error } = await supabase
    .from("categories")
    .select("id,category_type")
    .eq("id", primaryCategoryId)
    .maybeSingle();

  return !error && data?.category_type === "product";
}

function redirectAfterDuplicate(newProductId: string, message: string): never {
  const params = new URLSearchParams({
    success: message,
    tab: "products",
    editProduct: newProductId,
  });
  redirect(`${ADMIN_PATH}?${params.toString()}`);
}

function redirectWithProductEdit(
  kind: "success" | "error",
  message: string,
  productId: string,
): never {
  const params = new URLSearchParams({
    [kind]: message,
    tab: "products",
    editProduct: productId,
  });
  redirect(`${ADMIN_PATH}?${params.toString()}`);
}

function revalidateCategoryPaths() {
  revalidatePath(ADMIN_PATH);
  revalidatePath("/");
  revalidatePath("/categorii");
  revalidatePath("/categorii");
  revalidatePath("/povodi");
  revalidatePath("/povodi");
  revalidatePath("/producti");
  revalidatePath("/categorii/[slug]", "page");
  revalidatePath("/categorii/[slug]", "page");
}

async function getProductGalleryImageCount(
  supabase: NonNullable<Awaited<ReturnType<typeof createClient>>>,
  productId: string,
) {
  const [{ count, error }, { data: product }] = await Promise.all([
    supabase
      .from("product_images")
      .select("id", { count: "exact", head: true })
      .eq("product_id", productId),
    supabase.from("products").select("image_url").eq("id", productId).maybeSingle(),
  ]);

  if (error) {
    return product?.image_url ? 1 : 0;
  }

  if ((count ?? 0) > 0) {
    return count ?? 0;
  }

  return product?.image_url ? 1 : 0;
}

async function deleteUploadedImagesBestEffort(
  supabase: NonNullable<Awaited<ReturnType<typeof createClient>>>,
  images: UploadedProductImage[],
) {
  const adapter = createSupabaseProductImageStorageAdapter(supabase);
  await deleteStoragePathsBestEffort(adapter, getUploadedImagePaths(images));
}

async function attachProductImages(
  supabase: NonNullable<Awaited<ReturnType<typeof createClient>>>,
  productId: string,
  images: UploadedProductImage[],
  altTexts: string[] = [],
) {
  if (images.length === 0) {
    return null;
  }

  const { error } = await supabase.rpc("admin_attach_product_images", {
    p_product_id: productId,
    p_images: images.map((image, index) => ({
      image_url: image.url,
      alt_text: altTexts[index]?.trim() || null,
    })),
  });
  return error;
}

function getProductImageAltTexts(formData: FormData) {
  return formData
    .getAll(adminFormFields.product.imageAltTexts)
    .map((value) => String(value ?? "").trim().slice(0, 160));
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
  const selectionModes = formData
    .getAll(adminFormFields.colorField.selectionModes)
    .map((value) => String(value ?? "").trim());
  const requiredTotals = formData
    .getAll(adminFormFields.colorField.requiredTotalQuantities)
    .map((value) => String(value ?? "").trim());

  const parsedFields: ParsedColorField[] = [];

  for (let index = 0; index < labels.length; index += 1) {
    const label = labels[index] ?? "";
    const groupId = formGroupIds[index] ?? "";
    const minRaw = mins[index] ?? "";
    const maxRaw = maxes[index] ?? "";
    const optionCsv = optionCsvs[index] ?? "";
    const selectionModeRaw = selectionModes[index] ?? "choice";
    const selectionMode = selectionModeRaw === "quantity" ? "quantity" : "choice";
    const requiredTotalRaw = requiredTotals[index] ?? "";

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

    let minSelect = parseSelectLimit(minRaw, 0);
    let maxSelect = parseSelectLimit(maxRaw, 1);
    let requiredTotalQuantity: number | null = null;

    if (selectionMode === "quantity") {
      const parsedRequiredTotal = Number(requiredTotalRaw);
      if (!Number.isFinite(parsedRequiredTotal) || parsedRequiredTotal < 1) {
        return {
          fields: [],
          error: "Задайте валиден общ брой елементи за режим „Цветове с количества“.",
        };
      }
      requiredTotalQuantity = Math.trunc(parsedRequiredTotal);
      minSelect = 1;
      maxSelect = 1;
    }

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
    if (
      selectionMode !== "quantity" &&
      (optionIds.length < minSelect || optionIds.length < maxSelect)
    ) {
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
      selectionMode,
      requiredTotalQuantity,
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
  const priceDeltas = formData
    .getAll(adminFormFields.personalizationField.priceDeltas)
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
    const priceDelta = priceDeltas[index] ?? 0;

    if (
      !label ||
      !/^[a-z][a-z0-9_]{0,63}$/.test(key) ||
      !["text", "textarea", "date"].includes(type) ||
      !Number.isInteger(maxLength) ||
      maxLength < 1 ||
      maxLength > 1000 ||
      !Number.isFinite(priceDelta) ||
      priceDelta < 0 ||
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
      priceDelta,
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
  const subtitle = getOptionalString(formData, adminFormFields.product.subtitle);
  const description = getString(formData, adminFormFields.product.description);
  const additionalInfo = getOptionalString(formData, adminFormFields.product.additionalInfo);
  const fulfillmentNote = getOptionalString(formData, adminFormFields.product.fulfillmentNote);
  const isCustomizable = isChecked(formData, adminFormFields.product.isCustomizable);
  const isSoldOut = isChecked(formData, adminFormFields.product.isSoldOut);
  const {
    fulfillmentType,
    stockQuantity,
    error: fulfillmentError,
  } = parseProductFulfillmentFromFormData(formData);
  const cardBadge = normalizeProductCardBadge(
    getOptionalString(formData, adminFormFields.product.cardBadge),
  );
  const { slug, error: slugError } = parseSubmittedProductSlug(formData, name);
  const imageFiles = getFiles(formData, adminFormFields.product.imageFiles);
  const imageAltTexts = getProductImageAltTexts(formData);
  const galleryUploadError = await validateProductImageUploadBatch(imageFiles, 0);
  const price = getPrice(formData);
  const categoryIds = getCategoryIds(formData);
  const primaryCategoryId = getPrimaryCategoryId(formData);
  const wishTemplateIds = getWishTemplateIds(formData);
  const { fields: colorFields, error: colorFieldsError } = await parseProductColorFields(
    supabase,
    formData,
  );
  const {
    fields: personalizationFields,
    error: personalizationFieldsError,
  } = parseProductPersonalizationFields(formData);
  const { groups: optionGroups, error: optionGroupsError } =
    parseProductOptionGroups(formData);
  const { payload: productContent, error: productContentError } =
    parseProductContentFromFormData(formData);

  if (slugError) {
    redirectWith("error", slugError, activeTab, draft);
  }

  if (!name || price === null || categoryIds.length === 0) {
    redirectWith(
      "error",
      "Попълнете име, валидна цена и изберете поне една категория.",
      activeTab,
      draft,
    );
  }
  if (!(await validatePrimaryProductCategory(supabase, categoryIds, primaryCategoryId))) {
    redirectWith(
      "error",
      "Изберете основна продуктова категория.",
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
  if (optionGroupsError) {
    redirectWith("error", optionGroupsError, activeTab, draft);
  }
  if (productContentError) {
    redirectWith("error", productContentError, activeTab, draft);
  }
  if (fulfillmentError) {
    redirectWith("error", fulfillmentError, activeTab, draft);
  }
  if (galleryUploadError) {
    redirectWith("error", galleryUploadError, activeTab, draft);
  }
  detectDuplicateOptionWarnings(
    optionGroups,
    colorFields.map((field) => field.label),
    personalizationFields.map((field) => field.label),
  );

  const { data: productId, error: mutationError } = await createProductAtomic(supabase, {
    name,
    slug: slug!,
    subtitle,
    description,
    additionalInfo,
    fulfillmentNote,
    price,
    imageUrl: null,
    isCustomizable: isCustomizable || personalizationFields.length > 0,
    isSoldOut,
    fulfillmentType,
    stockQuantity,
    cardBadge,
    categoryIds,
    primaryCategoryId,
    colorFields,
    personalizationFields,
    wishTemplateIds,
    optionGroups,
    metaTitle: productContent.meta_title,
    metaDescription: productContent.meta_description,
    ogTitle: productContent.og_title,
    ogDescription: productContent.og_description,
  });

  if (mutationError || !productId) {
    redirectWith(
      "error",
      getProductMutationErrorMessage(mutationError),
      activeTab,
      draft,
    );
  }

  const newProductId = String(productId);
  let uploadedImages: UploadedProductImage[] = [];
  if (imageFiles.length > 0) {
    try {
      uploadedImages = await processAndUploadProductImages(
        supabase,
        newProductId,
        imageFiles,
        0,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : "Неуспешно качване на изображението.";
      await revalidateProductPaths(supabase, newProductId);
      redirectWithProductEdit(
        "error",
        `Продуктът е създаден, но снимките не бяха качени: ${message}. Изберете ги отново в секцията „Галерия“ по-долу.`,
        newProductId,
      );
    }
  }

  const galleryError = await attachProductImages(
    supabase,
    newProductId,
    uploadedImages,
    imageAltTexts,
  );
  if (galleryError) {
    await deleteUploadedImagesBestEffort(supabase, uploadedImages);
    await revalidateProductPaths(supabase, newProductId);
    const migrationMissing = galleryError.message.includes("admin_attach_product_images");
    redirectWithProductEdit(
      "error",
      migrationMissing
        ? "Продуктът е създаден, но галерията не беше записана. Изпълнете product_image_gallery.sql и добавете снимките от секцията „Галерия“."
        : "Продуктът е създаден, но снимките не бяха записани в галерията. Опитайте отново от секцията „Галерия“.",
      newProductId,
    );
  }

  await revalidateProductPaths(supabase,newProductId);
  const optimizationSummary =
    uploadedImages.length > 0
      ? ` Оптимизирани ${uploadedImages.length} снимки.`
      : "";
  redirectWith("success", `Продуктът е добавен.${optimizationSummary}`, activeTab);
}

export async function updateProduct(formData: FormData) {
  const supabase = await getAuthorizedClient();
  const activeTab = getAdminTab(formData, "products");

  const id = getString(formData, adminFormFields.common.id);
  const name = getString(formData, adminFormFields.product.name);
  const subtitle = getOptionalString(formData, adminFormFields.product.subtitle);
  const description = getString(formData, adminFormFields.product.description);
  const additionalInfo = getOptionalString(formData, adminFormFields.product.additionalInfo);
  const fulfillmentNote = getOptionalString(formData, adminFormFields.product.fulfillmentNote);
  const existingImageUrl = getString(formData, adminFormFields.product.existingImageUrl) || null;
  const categoryIds = getCategoryIds(formData);
  const primaryCategoryId = getPrimaryCategoryId(formData);
  const wishTemplateIds = getWishTemplateIds(formData);
  const isCustomizable = isChecked(formData, adminFormFields.product.isCustomizable);
  const isSoldOut = isChecked(formData, adminFormFields.product.isSoldOut);
  const {
    fulfillmentType,
    stockQuantity,
    error: fulfillmentError,
  } = parseProductFulfillmentFromFormData(formData);
  const cardBadge = normalizeProductCardBadge(
    getOptionalString(formData, adminFormFields.product.cardBadge),
  );
  const { slug, error: slugError } = parseSubmittedProductSlug(formData, name);
  const price = getPrice(formData);
  const imageFiles = getFiles(formData, adminFormFields.product.imageFiles);
  const imageAltTexts = getProductImageAltTexts(formData);
  const existingGalleryCount = id ? await getProductGalleryImageCount(supabase, id) : 0;
  const galleryUploadError =
    imageFiles.length > 0
      ? await validateProductImageUploadBatch(imageFiles, existingGalleryCount)
      : null;
  const { fields: colorFields, error: colorFieldsError } = await parseProductColorFields(
    supabase,
    formData,
  );
  const {
    fields: personalizationFields,
    error: personalizationFieldsError,
  } = parseProductPersonalizationFields(formData);
  const { groups: optionGroups, error: optionGroupsError } =
    parseProductOptionGroups(formData);
  const { payload: productContent, error: productContentError } =
    parseProductContentFromFormData(formData);

  if (slugError) {
    redirectWithProductEdit("error", slugError, id);
  }

  if (!id || !name || price === null || categoryIds.length === 0) {
    redirectWith("error", "Невалидни данни за редакция.", activeTab);
  }
  if (!(await validatePrimaryProductCategory(supabase, categoryIds, primaryCategoryId))) {
    redirectWithProductEdit(
      "error",
      "Изберете основна продуктова категория.",
      id,
    );
  }
  if (galleryUploadError) {
    redirectWithProductEdit("error", galleryUploadError, id);
  }
  if (colorFieldsError) {
    redirectWith("error", colorFieldsError, activeTab);
  }
  if (personalizationFieldsError) {
    redirectWith("error", personalizationFieldsError, activeTab);
  }
  if (optionGroupsError) {
    redirectWith("error", optionGroupsError, activeTab);
  }
  if (productContentError) {
    redirectWithProductEdit("error", productContentError, id);
  }
  if (fulfillmentError) {
    redirectWithProductEdit("error", fulfillmentError, id);
  }
  detectDuplicateOptionWarnings(
    optionGroups,
    colorFields.map((field) => field.label),
    personalizationFields.map((field) => field.label),
  );

  const { error: mutationError } = await updateProductAtomic(
    supabase,
    id,
    {
      name,
      slug: slug!,
      subtitle,
      description,
      additionalInfo,
      fulfillmentNote,
      price,
      imageUrl: existingImageUrl,
      isCustomizable: isCustomizable || personalizationFields.length > 0,
      isSoldOut,
      fulfillmentType,
      stockQuantity,
      cardBadge,
      categoryIds,
      primaryCategoryId,
      colorFields,
      personalizationFields,
      wishTemplateIds,
      optionGroups,
      metaTitle: productContent.meta_title,
      metaDescription: productContent.meta_description,
      ogTitle: productContent.og_title,
      ogDescription: productContent.og_description,
    },
  );

  if (mutationError) {
    redirectWithProductEdit(
      "error",
      getProductMutationErrorMessage(mutationError),
      id,
    );
  }

  let uploadedImages: UploadedProductImage[] = [];
  if (imageFiles.length > 0) {
    try {
      uploadedImages = await processAndUploadProductImages(
        supabase,
        id,
        imageFiles,
        existingGalleryCount,
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Неуспешно качване на изображението.";
      redirectWithProductEdit(
        "error",
        `Продуктът е запазен, но снимките не бяха качени: ${message}`,
        id,
      );
    }

    const galleryError = await attachProductImages(supabase, id, uploadedImages, imageAltTexts);
    if (galleryError) {
      await deleteUploadedImagesBestEffort(supabase, uploadedImages);
      const migrationMissing = galleryError.message.includes("admin_attach_product_images");
      redirectWithProductEdit(
        "error",
        migrationMissing
          ? "Продуктът е запазен, но снимките не бяха добавени. Изпълнете product_image_gallery.sql."
          : "Продуктът е запазен, но снимките не бяха добавени към галерията.",
        id,
      );
    }
  }

  await revalidateProductPaths(supabase,id);
  const optimizationSummary =
    uploadedImages.length > 0 ? ` Качени ${uploadedImages.length} оптимизирани снимки.` : "";
  redirectWithProductEdit("success", `Продуктът е обновен.${optimizationSummary}`, id);
}

export async function addProductGalleryImages(formData: FormData) {
  const supabase = await getAuthorizedClient();
  const activeTab = getAdminTab(formData, "products");
  const id = getString(formData, adminFormFields.common.id);
  const imageFiles = getFiles(formData, adminFormFields.product.imageFiles);
  const imageAltTexts = getProductImageAltTexts(formData);
  const existingGalleryCount = id ? await getProductGalleryImageCount(supabase, id) : 0;
  const galleryUploadError = await validateProductImageUploadBatch(
    imageFiles,
    existingGalleryCount,
  );

  if (!id) {
    redirectWith("error", "Липсва продукт за добавяне на снимки.", activeTab);
  }
  if (imageFiles.length === 0) {
    redirectWithProductEdit("error", "Изберете поне една снимка за качване.", id);
  }
  if (galleryUploadError) {
    redirectWithProductEdit("error", galleryUploadError, id);
  }

  let uploadedImages: UploadedProductImage[] = [];
  try {
    uploadedImages = await processAndUploadProductImages(
      supabase,
      id,
      imageFiles,
      existingGalleryCount,
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Неуспешно качване на изображението.";
    redirectWithProductEdit("error", `Грешка при качване на изображение: ${message}`, id);
  }

  const galleryError = await attachProductImages(supabase, id, uploadedImages, imageAltTexts);
  if (galleryError) {
    await deleteUploadedImagesBestEffort(supabase, uploadedImages);
    const migrationMissing = galleryError.message.includes("admin_attach_product_images");
    redirectWithProductEdit(
      "error",
      migrationMissing
        ? "Снимките не бяха добавени. Изпълнете product_image_gallery.sql."
        : "Снимките не бяха добавени към галерията.",
      id,
    );
  }

  await revalidateProductPaths(supabase,id);
  redirectWithProductEdit(
    "success",
    `Добавени ${uploadedImages.length} оптимизирани снимки към галерията.`,
    id,
  );
}

export async function replaceProductGalleryImage(formData: FormData) {
  const supabase = await getAuthorizedClient();
  const imageId = getString(formData, adminFormFields.productImage.imageId);
  const productId = getString(formData, adminFormFields.common.id);
  const replaceFile = getFiles(formData, adminFormFields.productImage.replaceFile)[0];

  if (!imageId || !productId) {
    redirectWith("error", "Невалидна заявка за замяна на снимка.", "products");
  }
  if (!(replaceFile instanceof File)) {
    redirectWithProductEdit("error", "Изберете нова снимка за замяна.", productId);
  }

  const { data: existingImage, error: existingError } = await supabase
    .from("product_images")
    .select("id, product_id, image_url")
    .eq("id", imageId)
    .eq("product_id", productId)
    .maybeSingle();

  if (existingError || !existingImage) {
    redirectWithProductEdit("error", "Снимката не беше намерена.", productId);
  }

  const galleryUploadError = await validateProductImageUploadBatch([replaceFile], 0);
  if (galleryUploadError) {
    redirectWithProductEdit("error", galleryUploadError, productId);
  }

  let uploadedImages: UploadedProductImage[] = [];
  try {
    uploadedImages = await processAndUploadProductImages(supabase, productId, [replaceFile], 0);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Неуспешно качване на изображението.";
    redirectWithProductEdit("error", `Грешка при обработка на снимката: ${message}`, productId);
  }

  const uploaded = uploadedImages[0];
  if (!uploaded) {
    redirectWithProductEdit("error", "Новата снимка не беше качена.", productId);
  }

  const { data, error } = await supabase.rpc("admin_replace_product_gallery_image", {
    p_image_id: imageId,
    p_image_url: uploaded.url,
  });

  if (error || !data || typeof data !== "object") {
    await deleteUploadedImagesBestEffort(supabase, uploadedImages);
    const migrationMissing = error?.message.includes("admin_replace_product_gallery_image");
    redirectWithProductEdit(
      "error",
      migrationMissing
        ? "Снимката не беше заменена. Изпълнете product_gallery_import_replace.sql."
        : "Снимката не беше заменена. Оригиналът е запазен.",
      productId,
    );
  }

  const result = data as { old_image_url?: unknown };
  const oldStoragePath = getProductImagePath(
    typeof result.old_image_url === "string" ? result.old_image_url : existingImage.image_url,
  );

  if (oldStoragePath) {
    const adapter = createSupabaseProductImageStorageAdapter(supabase);
    const cleanup = await deleteStoragePathsBestEffort(adapter, [oldStoragePath]);
    if (cleanup.errorMessage) {
      await revalidateProductPaths(supabase,productId);
      redirectWithProductEdit(
        "error",
        `Снимката е заменена, но ${cleanup.errorMessage}`,
        productId,
      );
    }
  }

  await revalidateProductPaths(supabase,productId);
  redirectWithProductEdit("success", "Снимката е заменена успешно.", productId);
}

export async function updateProductMerchandising(formData: FormData) {
  const supabase = await getAuthorizedClient();
  const id = getString(formData, adminFormFields.common.id);
  const isFeatured = isChecked(
    formData,
    adminFormFields.merchandising.isFeatured,
  );
  const rawSortOrder = Number(
    getString(formData, adminFormFields.merchandising.homeSortOrder),
  );
  const homeSortOrder =
    Number.isInteger(rawSortOrder) && rawSortOrder >= 0 ? rawSortOrder : 0;
  const relatedProductIds = Array.from(
    new Set(
      formData
        .getAll(adminFormFields.merchandising.relatedProductIds)
        .map((value) => String(value ?? "").trim())
        .filter((value) => value && value !== id),
    ),
  ).slice(0, 8);

  if (!id) {
    redirectWith("error", "Липсва продукт за настройване.", "products");
  }

  const { error } = await supabase.rpc(
    "admin_replace_product_merchandising",
    {
      p_product_id: id,
      p_is_featured: isFeatured,
      p_home_sort_order: homeSortOrder,
      p_related_product_ids: relatedProductIds,
    },
  );

  if (error) {
    const migrationMissing = error.message.includes(
      "admin_replace_product_merchandising",
    );
    redirectWith(
      "error",
      migrationMissing
        ? "Липсва миграцията product_merchandising.sql в Supabase."
        : `Настройките не бяха запазени: ${error.message}`,
      "products",
    );
  }

  await revalidateProductPaths(supabase,id);
  redirectWith(
    "success",
    "Настройките за началната страница и свързаните продукти са запазени.",
    "products",
  );
}

export async function toggleProductSoldOut(formData: FormData) {
  const supabase = await getAuthorizedClient();
  const activeTab = getAdminTab(formData, "products");
  const id = getString(formData, adminFormFields.common.id);
  const soldOutTarget = getString(formData, "sold_out_target");
  const soldOut =
    soldOutTarget === "true"
      ? true
      : soldOutTarget === "false"
        ? false
        : isChecked(formData, adminFormFields.product.isSoldOut);

  if (!id) {
    redirectWith("error", "Липсва id за промяна.", activeTab);
  }

  const { error } = await supabase
    .from("products")
    .update({ is_sold_out: soldOut })
    .eq("id", id);

  if (error) {
    redirectWith("error", "Статусът на продукта не беше обновен.", activeTab);
  }

  await revalidateProductPaths(supabase,id);
  redirectWith(
    "success",
    soldOut ? "Продуктът е маркиран като изчерпан." : "Продуктът е активиран отново.",
    activeTab,
  );
}

export async function duplicateProduct(formData: FormData) {
  const supabase = await getAuthorizedClient();
  const activeTab = getAdminTab(formData, "products");
  const sourceId = getString(formData, adminFormFields.common.id);

  if (!sourceId) {
    redirectWith("error", "Липсва продукт за дублиране.", activeTab);
  }

  const { data: newProductId, error: duplicateError } = await duplicateProductAtomic(
    supabase,
    sourceId,
  );

  if (duplicateError || !newProductId) {
    redirectWith("error", getDuplicateProductErrorMessage(duplicateError), activeTab);
  }

  const newId = String(newProductId);
  const { data: newProduct } = await supabase
    .from("products")
    .select("name")
    .eq("id", newId)
    .maybeSingle();

  const copyImages = shouldCopyDuplicateImages(formData);
  let imageWarning: string | null = null;

  if (copyImages) {
    const galleryCopy = await copyProductGalleryImagesToProduct(
      supabase,
      sourceId,
      newId,
      String(newProduct?.name ?? "Продукт"),
    );

    if (galleryCopy.totalCount > 0 && galleryCopy.copiedCount === 0) {
      imageWarning = DUPLICATE_IMAGE_WARNING;
    } else if (
      galleryCopy.totalCount > 0 &&
      galleryCopy.copiedCount < galleryCopy.totalCount
    ) {
      imageWarning =
        "Част от изображенията не бяха копирани. Прегледайте галерията и добавете липсващите снимки.";
    }
  }

  await revalidateProductPaths(supabase,newId);
  redirectAfterDuplicate(
    newId,
    buildDuplicateSuccessMessage(imageWarning, { copyImagesRequested: copyImages }),
  );
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

  const legacyPaths = [
    ...(galleryRows ?? []).map((row) => getProductImagePath(String(row.image_url))),
    getProductImagePath(typeof imageUrl === "string" ? imageUrl : null),
  ].filter((path): path is string => Boolean(path));

  const adapter = createSupabaseProductImageStorageAdapter(supabase);
  const cleanup = await deleteProductScopedStoragePaths(adapter, id, legacyPaths);
  if (cleanup.errorMessage) {
    await revalidateProductPaths(supabase,id);
    redirectWith(
      "error",
      `Продуктът е изтрит от каталога, но ${cleanup.errorMessage}`,
      activeTab,
    );
  }

  await revalidateProductPaths(supabase,id);
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

  await revalidateProductPaths(supabase,image?.product_id ? String(image.product_id) : undefined);
  redirectWith("success", "Основната снимка е променена.", "products");
}

export async function updateProductImageAltText(formData: FormData) {
  const supabase = await getAuthorizedClient();
  const imageId = getString(formData, adminFormFields.productImage.imageId);
  const altText =
    getOptionalString(formData, adminFormFields.productImage.altText)?.slice(0, 160) ??
    null;

  if (!imageId) {
    redirectWith("error", "Липсва снимка за редакция.", "products");
  }

  const { data: image } = await supabase
    .from("product_images")
    .select("product_id")
    .eq("id", imageId)
    .single();

  const { error } = await supabase
    .from("product_images")
    .update({ alt_text: altText })
    .eq("id", imageId);

  if (error) {
    redirectWith("error", "Alt текстът не беше запазен.", "products");
  }

  await revalidateProductPaths(
    supabase,
    image?.product_id ? String(image.product_id) : undefined,
  );
  redirectWith("success", "Alt текстът е запазен.", "products");
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

  await revalidateProductPaths(supabase,image?.product_id ? String(image.product_id) : undefined);
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
  const productId =
    typeof result.product_id === "string" ? result.product_id : null;
  const storagePath = getProductImagePath(
    typeof result.image_url === "string" ? result.image_url : null,
  );

  if (storagePath) {
    const adapter = createSupabaseProductImageStorageAdapter(supabase);
    const cleanup = await deleteStoragePathsBestEffort(adapter, [storagePath]);
    if (cleanup.errorMessage) {
      await revalidateProductPaths(supabase,productId ?? undefined);
      redirectWith("error", cleanup.errorMessage, "products");
    }
  }

  await revalidateProductPaths(supabase,productId ?? undefined);
  redirectWith("success", "Снимката е изтрита.", "products");
}

export async function createCategory(formData: FormData) {
  const supabase = await getAuthorizedClient();
  const activeTab = getAdminTab(formData, "categories");
  const name = getString(formData, adminFormFields.category.name);
  const slug = normalizeSlug(getString(formData, adminFormFields.category.slug));
  const categoryType = getString(formData, adminFormFields.category.type);
  const parentId =
    getString(formData, adminFormFields.category.parentId) || null;
  const showOnHome = isChecked(formData, adminFormFields.category.showOnHome);
  const isVisible = isChecked(formData, adminFormFields.category.isVisible);
  const cardDescription =
    getString(formData, adminFormFields.category.cardDescription).trim() || null;
  const imageFile = getFile(formData, adminFormFields.category.imageFile);
  const coverImageFile = getFile(formData, adminFormFields.category.coverImageFile);
  const imageAlt =
    getOptionalString(formData, adminFormFields.category.imageAlt)?.trim().slice(0, 160) ??
    null;
  const coverImageAlt =
    getOptionalString(formData, adminFormFields.category.coverImageAlt)
      ?.trim()
      .slice(0, 160) ?? null;
  const { payload: categoryContent, error: categoryContentError } =
    parseCategoryContentFromFormData(formData);

  if (!name || !slug || !["product", "occasion"].includes(categoryType)) {
    redirectWith("error", "Попълнете име и slug за категорията.", activeTab);
  }

  if (categoryContentError) {
    redirectWith("error", categoryContentError, activeTab);
  }

  if (parentId && categoryType !== "product") {
    redirectWith("error", "Само продуктовите категории могат да имат подкатегории.", activeTab);
  }

  if (parentId) {
    const { data: parentCategory, error: parentError } = await supabase
      .from("categories")
      .select("id,category_type,parent_id")
      .eq("id", parentId)
      .maybeSingle();
    if (
      parentError ||
      !parentCategory ||
      parentCategory.category_type !== "product" ||
      parentCategory.parent_id
    ) {
      redirectWith("error", "Избраната основна категория е невалидна.", activeTab);
    }
  }

  let lastCategoryQuery = supabase
    .from("categories")
    .select("home_sort_order")
    .eq("category_type", categoryType);
  lastCategoryQuery = parentId
    ? lastCategoryQuery.eq("parent_id", parentId)
    : lastCategoryQuery.is("parent_id", null);
  const { data: lastCategory } = await lastCategoryQuery
    .order("home_sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  const homeSortOrder = (Number(lastCategory?.home_sort_order) || 0) + 10;

  let uploadedCategoryImage: Awaited<ReturnType<typeof uploadAdminImage>> | null = null;
  let uploadedCoverImage: Awaited<ReturnType<typeof uploadAdminImage>> | null = null;
  if (imageFile) {
    try {
      uploadedCategoryImage = await uploadAdminImage(supabase, imageFile, "categories");
    } catch (error) {
      redirectWith(
        "error",
        `Снимката на категорията не беше качена: ${
          error instanceof Error ? error.message : "неочаквана грешка"
        }`,
        activeTab,
      );
    }
  }
  if (coverImageFile) {
    try {
      uploadedCoverImage = await uploadAdminImage(supabase, coverImageFile, "categories");
    } catch (error) {
      if (uploadedCategoryImage) {
        await deleteProductImage(supabase, uploadedCategoryImage.path).catch(() => undefined);
      }
      redirectWith(
        "error",
        `Cover снимката не беше качена: ${
          error instanceof Error ? error.message : "неочаквана грешка"
        }`,
        activeTab,
      );
    }
  }

  const { error } = await supabase
    .from("categories")
    .insert({
      name,
      slug,
      category_type: categoryType,
      parent_id: parentId,
      image_url: uploadedCategoryImage?.url ?? null,
      image_alt: imageAlt,
      cover_image_url: uploadedCoverImage?.url ?? null,
      cover_image_alt: coverImageAlt,
      show_on_home: parentId ? false : showOnHome,
      is_visible: isVisible,
      home_sort_order: homeSortOrder,
      card_description: cardDescription,
      ...categoryContent,
    });
  if (error) {
    if (uploadedCategoryImage) {
      await deleteProductImage(supabase, uploadedCategoryImage.path).catch(() => undefined);
    }
    if (uploadedCoverImage) {
      await deleteProductImage(supabase, uploadedCoverImage.path).catch(() => undefined);
    }
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
  const parentId =
    getString(formData, adminFormFields.category.parentId) || null;
  const showOnHome = isChecked(formData, adminFormFields.category.showOnHome);
  const isVisible = isChecked(formData, adminFormFields.category.isVisible);
  const cardDescription =
    getString(formData, adminFormFields.category.cardDescription).trim() || null;
  const imageFile = getFile(formData, adminFormFields.category.imageFile);
  const coverImageFile = getFile(formData, adminFormFields.category.coverImageFile);
  const imageAlt =
    getOptionalString(formData, adminFormFields.category.imageAlt)?.trim().slice(0, 160) ??
    null;
  const coverImageAlt =
    getOptionalString(formData, adminFormFields.category.coverImageAlt)
      ?.trim()
      .slice(0, 160) ?? null;
  const { payload: categoryContent, error: categoryContentError } =
    parseCategoryContentFromFormData(formData);

  if (!id || !name || !slug || !["product", "occasion"].includes(categoryType)) {
    redirectWith("error", "Невалидни данни за категория.", activeTab);
  }

  if (categoryContentError) {
    redirectWith("error", categoryContentError, activeTab);
  }

  if (parentId === id) {
    redirectWith("error", "Категорията не може да бъде собствена подкатегория.", activeTab);
  }
  if (parentId && categoryType !== "product") {
    redirectWith("error", "Само продуктовите категории могат да имат подкатегории.", activeTab);
  }
  if (parentId) {
    const { data: parentCategory, error: parentError } = await supabase
      .from("categories")
      .select("id,category_type,parent_id")
      .eq("id", parentId)
      .maybeSingle();
    if (
      parentError ||
      !parentCategory ||
      parentCategory.category_type !== "product" ||
      parentCategory.parent_id
    ) {
      redirectWith("error", "Избраната основна категория е невалидна.", activeTab);
    }
  }

  const { data: existingCategory, error: existingCategoryError } = await supabase
    .from("categories")
    .select("category_type,parent_id,home_sort_order,image_url,cover_image_url")
    .eq("id", id)
    .single();
  if (existingCategoryError || !existingCategory) {
    redirectWith("error", "Категорията не беше намерена.", activeTab);
  }

  let homeSortOrder = existingCategory.home_sort_order;
  if (
    existingCategory.category_type !== categoryType ||
    existingCategory.parent_id !== parentId
  ) {
    let lastCategoryQuery = supabase
      .from("categories")
      .select("home_sort_order")
      .eq("category_type", categoryType)
      .neq("id", id);
    lastCategoryQuery = parentId
      ? lastCategoryQuery.eq("parent_id", parentId)
      : lastCategoryQuery.is("parent_id", null);
    const { data: lastCategory } = await lastCategoryQuery
      .order("home_sort_order", { ascending: false })
      .limit(1)
      .maybeSingle();
    homeSortOrder = (Number(lastCategory?.home_sort_order) || 0) + 10;
  }

  let uploadedCategoryImage: Awaited<ReturnType<typeof uploadAdminImage>> | null = null;
  let uploadedCoverImage: Awaited<ReturnType<typeof uploadAdminImage>> | null = null;
  if (imageFile) {
    try {
      uploadedCategoryImage = await uploadAdminImage(supabase, imageFile, "categories");
    } catch (error) {
      redirectWith(
        "error",
        `Снимката на категорията не беше качена: ${
          error instanceof Error ? error.message : "неочаквана грешка"
        }`,
        activeTab,
      );
    }
  }
  if (coverImageFile) {
    try {
      uploadedCoverImage = await uploadAdminImage(supabase, coverImageFile, "categories");
    } catch (error) {
      if (uploadedCategoryImage) {
        await deleteProductImage(supabase, uploadedCategoryImage.path).catch(() => undefined);
      }
      redirectWith(
        "error",
        `Cover снимката не беше качена: ${
          error instanceof Error ? error.message : "неочаквана грешка"
        }`,
        activeTab,
      );
    }
  }

  const { error } = await supabase
    .from("categories")
    .update({
      name,
      slug,
      category_type: categoryType,
      parent_id: parentId,
      ...(uploadedCategoryImage ? { image_url: uploadedCategoryImage.url } : {}),
      image_alt: imageAlt,
      ...(uploadedCoverImage ? { cover_image_url: uploadedCoverImage.url } : {}),
      cover_image_alt: coverImageAlt,
      show_on_home: parentId ? false : showOnHome,
      is_visible: isVisible,
      home_sort_order: homeSortOrder,
      card_description: cardDescription,
      ...categoryContent,
    })
    .eq("id", id);
  if (error) {
    if (uploadedCategoryImage) {
      await deleteProductImage(supabase, uploadedCategoryImage.path).catch(() => undefined);
    }
    if (uploadedCoverImage) {
      await deleteProductImage(supabase, uploadedCoverImage.path).catch(() => undefined);
    }
    redirectWith("error", `Грешка при редакция на категория: ${error.message}`, activeTab);
  }

  if (uploadedCategoryImage && existingCategory.image_url) {
    const previousImagePath = getProductImagePath(existingCategory.image_url);
    if (previousImagePath) {
      await deleteProductImage(supabase, previousImagePath).catch(() => undefined);
    }
  }
  if (uploadedCoverImage && existingCategory.cover_image_url) {
    const previousCoverPath = getProductImagePath(existingCategory.cover_image_url);
    if (previousCoverPath) {
      await deleteProductImage(supabase, previousCoverPath).catch(() => undefined);
    }
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

  const { count: childCount, error: childCountError } = await supabase
    .from("categories")
    .select("id", { count: "exact", head: true })
    .eq("parent_id", id);
  if (childCountError) {
    redirectWith("error", "Категорията не можа да бъде проверена за подкатегории.", activeTab);
  }
  if ((childCount ?? 0) > 0) {
    redirectWith(
      "error",
      "Първо преместете или изтрийте подкатегориите на тази категория.",
      activeTab,
    );
  }

  const { error } = await supabase.from("categories").delete().eq("id", id);
  if (error) {
    redirectWith("error", `Грешка при изтриване на категория: ${error.message}`, activeTab);
  }

  revalidateCategoryPaths();
  redirectWith("success", "Категорията е изтрита.", activeTab);
}
