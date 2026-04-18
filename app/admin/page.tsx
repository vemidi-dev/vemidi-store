import { redirect } from "next/navigation";

import { adminLogout } from "@/app/admin/login/actions";
import {
  createCategory,
  createProduct,
  deleteCategory,
  deleteProduct,
  updateCategory,
  updateProduct,
} from "@/app/admin/actions";
import { ImageFileInput } from "@/components/admin/image-file-input";
import { ProductColorFieldsEditor } from "@/components/admin/product-color-fields-editor";
import { PageContainer } from "@/components/layout/page-container";
import { checkIsAdmin } from "@/lib/supabase/admin-auth";
import { createClient } from "@/lib/supabase/server";

type AdminPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};
type AdminTab = "products" | "categories";

type ProductRow = {
  id: string;
  name: string;
  description: string;
  additional_info: string | null;
  fulfillment_note: string | null;
  price: number;
  image_url: string | null;
  is_customizable: boolean;
};
type ColorGroupRow = {
  id: string;
  key: string;
  label: string;
};
type ColorOptionRow = {
  id: string;
  group_id: string;
  name: string;
  hex: string | null;
  sort_order: number | null;
  is_active: boolean;
};
type ProductColorFieldRow = {
  id: string;
  product_id: string;
  group_id: string;
  label: string;
  enabled: boolean;
  min_select: number;
  max_select: number;
  sort_order: number;
};
type ProductColorFieldOptionRow = {
  field_id: string;
  color_option_id: string;
};
type CategoryRow = {
  id: string;
  name: string;
  slug: string;
};
type ProductCategoryRow = {
  product_id: string;
  category_id: string;
};

type ProductDraftColorField = {
  label: string;
  groupId: string;
  minSelect: number;
  maxSelect: number;
  optionIds: string[];
};

type ProductCreateDraft = {
  name: string;
  description: string;
  additionalInfo: string;
  fulfillmentNote: string;
  price: string;
  isCustomizable: boolean;
  categoryIds: string[];
  colorFields: ProductDraftColorField[];
};

function firstValue(value: string | string[] | undefined) {
  if (!value) {
    return "";
  }
  return Array.isArray(value) ? value[0] ?? "" : value;
}

function toNonNegativeInteger(value: string, fallback: number) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) {
    return fallback;
  }
  return parsed;
}

function parseProductCreateDraft(raw: string): ProductCreateDraft | null {
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as {
      name?: unknown;
      description?: unknown;
      additional_info?: unknown;
      fulfillment_note?: unknown;
      price?: unknown;
      is_customizable?: unknown;
      category_ids?: unknown;
      color_fields?: unknown;
    };

    const categoryIds = Array.isArray(parsed.category_ids)
      ? parsed.category_ids.filter((value): value is string => typeof value === "string" && value.trim().length > 0)
      : [];

    const colorFields = Array.isArray(parsed.color_fields)
      ? parsed.color_fields
          .map((field) => {
            if (!field || typeof field !== "object") {
              return null;
            }
            const candidate = field as {
              label?: unknown;
              group_id?: unknown;
              min_select?: unknown;
              max_select?: unknown;
              option_ids?: unknown;
            };
            const label = typeof candidate.label === "string" ? candidate.label : "";
            const groupId = typeof candidate.group_id === "string" ? candidate.group_id : "";
            const minSelect = toNonNegativeInteger(
              typeof candidate.min_select === "string" ? candidate.min_select : "",
              0,
            );
            const maxSelect = Math.max(
              1,
              toNonNegativeInteger(typeof candidate.max_select === "string" ? candidate.max_select : "", 1),
            );
            const optionIds =
              typeof candidate.option_ids === "string"
                ? candidate.option_ids
                    .split(",")
                    .map((value) => value.trim())
                    .filter(Boolean)
                : [];
            if (!label && !groupId && optionIds.length === 0) {
              return null;
            }
            return { label, groupId, minSelect, maxSelect, optionIds };
          })
          .filter((field): field is ProductDraftColorField => Boolean(field))
      : [];

    return {
      name: typeof parsed.name === "string" ? parsed.name : "",
      description: typeof parsed.description === "string" ? parsed.description : "",
      additionalInfo: typeof parsed.additional_info === "string" ? parsed.additional_info : "",
      fulfillmentNote: typeof parsed.fulfillment_note === "string" ? parsed.fulfillment_note : "",
      price: typeof parsed.price === "string" ? parsed.price : "",
      isCustomizable: parsed.is_customizable === true,
      categoryIds,
      colorFields,
    };
  } catch {
    return null;
  }
}

const fieldClass =
  "mt-2 w-full rounded-lg border border-boutique-line bg-boutique-bg px-3 py-2.5 text-sm text-boutique-ink outline-none transition placeholder:text-boutique-muted/60 focus:border-boutique-accent/50 focus:ring-2 focus:ring-boutique-accent/10";
const helperClass = "mt-1 text-xs leading-relaxed text-boutique-muted";

function redirectToAdminLogin(message: string): never {
  redirect(`/admin/login?message=${encodeURIComponent(message)}`);
}

export default async function AdminPage({ searchParams }: AdminPageProps) {
  const params = await searchParams;
  const success = firstValue(params.success);
  const error = firstValue(params.error);
  const draft = parseProductCreateDraft(firstValue(params.draft));
  const activeTab: AdminTab = firstValue(params.tab) === "categories" ? "categories" : "products";
  const makeTabHref = (tab: AdminTab) => {
    const query = new URLSearchParams();
    query.set("tab", tab);
    return `${tab === "products" ? "/admin" : `/admin?${query.toString()}`}`;
  };

  const supabase = await createClient();
  if (!supabase) {
    return (
      <section className="pb-24 pt-10">
        <PageContainer>
          <div className="rounded-xl border border-red-200 bg-red-50 px-6 py-5 text-sm text-red-700">
            Supabase не е конфигуриран. Добавете `NEXT_PUBLIC_SUPABASE_URL` и
            `NEXT_PUBLIC_SUPABASE_ANON_KEY` в `.env.local`.
          </div>
        </PageContainer>
      </section>
    );
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirectToAdminLogin("Моля, влезте като администратор.");
  }

  const { isAdmin, error: adminCheckError } = await checkIsAdmin(supabase, user.id);
  if (adminCheckError) {
    redirectToAdminLogin(
      "Липсва admin_users таблица или достъп. Изпълнете SQL скрипта за админи.",
    );
  }
  if (!isAdmin) {
    redirectToAdminLogin("Този профил няма админ права.");
  }

  const { data: productsData, error: listError } = await supabase
    .from("products")
    .select("*")
    .order("id", { ascending: false });
  const { data: categoriesData, error: categoriesError } = await supabase
    .from("categories")
    .select("id,name,slug")
    .order("name", { ascending: true });
  const { data: productCategoryData, error: productCategoriesError } = await supabase
    .from("product_categories")
    .select("product_id,category_id");
  const { data: colorGroupsData, error: colorGroupsError } = await supabase
    .from("color_groups")
    .select("id,key,label")
    .order("label", { ascending: true });
  const { data: colorOptionsData, error: colorOptionsError } = await supabase
    .from("color_options")
    .select("id,group_id,name,hex,sort_order,is_active")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });
  const { data: productColorFieldsData, error: productColorFieldsError } = await supabase
    .from("product_color_fields")
    .select("id,product_id,group_id,label,enabled,min_select,max_select,sort_order");
  const { data: productColorFieldOptionsData, error: productColorFieldOptionsError } = await supabase
    .from("product_color_field_options")
    .select("field_id,color_option_id");

  const products = (productsData ?? []) as ProductRow[];
  const categories = (categoriesData ?? []) as CategoryRow[];
  const productCategories = (productCategoryData ?? []) as ProductCategoryRow[];
  const colorGroups = (colorGroupsData ?? []) as ColorGroupRow[];
  const colorOptions = (colorOptionsData ?? []) as ColorOptionRow[];
  const productColorFields = (productColorFieldsData ?? []) as ProductColorFieldRow[];
  const productColorFieldOptions = (productColorFieldOptionsData ?? []) as ProductColorFieldOptionRow[];
  const categoryById = new Map(categories.map((category) => [category.id, category]));
  const categoryIdsByProductId = new Map<string, string[]>();
  const colorGroupById = new Map(colorGroups.map((group) => [group.id, group]));
  const colorOptionById = new Map(colorOptions.map((option) => [option.id, option]));
  const colorFieldsByProductId = new Map<string, ProductColorFieldRow[]>();
  const selectedColorOptionIdsByFieldId = new Map<string, Set<string>>();

  productCategories.forEach((row) => {
    const existing = categoryIdsByProductId.get(row.product_id) ?? [];
    existing.push(row.category_id);
    categoryIdsByProductId.set(row.product_id, existing);
  });
  productColorFields.forEach((field) => {
    const existing = colorFieldsByProductId.get(field.product_id) ?? [];
    existing.push(field);
    colorFieldsByProductId.set(field.product_id, existing);
  });
  colorFieldsByProductId.forEach((fields, productId) => {
    colorFieldsByProductId.set(
      productId,
      [...fields].sort((a, b) => {
        if (a.sort_order !== b.sort_order) {
          return a.sort_order - b.sort_order;
        }
        return a.label.localeCompare(b.label, "bg");
      }),
    );
  });
  productColorFieldOptions.forEach((selection) => {
    const existing = selectedColorOptionIdsByFieldId.get(selection.field_id) ?? new Set<string>();
    existing.add(selection.color_option_id);
    selectedColorOptionIdsByFieldId.set(selection.field_id, existing);
  });

  return (
    <section className="pb-24 pt-10">
      <PageContainer>
        <div className="mx-auto max-w-6xl space-y-8">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-boutique-accent">
              Админ
            </p>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
              <h1 className="font-heading text-3xl text-boutique-ink">Админ панел</h1>
              <form action={adminLogout}>
                <button
                  type="submit"
                  className="rounded-full border border-boutique-line px-4 py-2 text-xs font-semibold uppercase tracking-wider text-boutique-ink transition hover:border-boutique-accent/40"
                >
                  Изход
                </button>
              </form>
            </div>
          </div>

          <div className="inline-flex rounded-full border border-boutique-line bg-boutique-paper p-1">
            <a
              href={makeTabHref("products")}
              className={`rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-wider transition ${
                activeTab === "products"
                  ? "bg-boutique-ink text-boutique-paper"
                  : "text-boutique-ink hover:bg-boutique-bg"
              }`}
            >
              Управление на продукти
            </a>
            <a
              href={makeTabHref("categories")}
              className={`rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-wider transition ${
                activeTab === "categories"
                  ? "bg-boutique-ink text-boutique-paper"
                  : "text-boutique-ink hover:bg-boutique-bg"
              }`}
            >
              Управление на категории
            </a>
          </div>

          {success ? (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3.5 text-sm text-emerald-700">
              <p className="font-semibold">Успешно действие</p>
              <p className="mt-1">{success}</p>
            </div>
          ) : null}

          {error ? (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          ) : null}

          {listError ? (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              Грешка при зареждане на продукти: {listError.message}
            </div>
          ) : null}
          {categoriesError ? (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              Грешка при зареждане на категории: {categoriesError.message}
            </div>
          ) : null}
          {productCategoriesError ? (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              Грешка при зареждане на връзки продукт-категория: {productCategoriesError.message}
            </div>
          ) : null}
          {colorGroupsError ? (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              Грешка при зареждане на групи цветове: {colorGroupsError.message}
            </div>
          ) : null}
          {colorOptionsError ? (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              Грешка при зареждане на цветови опции: {colorOptionsError.message}
            </div>
          ) : null}
          {productColorFieldsError ? (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              Грешка при зареждане на цветови полета: {productColorFieldsError.message}
            </div>
          ) : null}
          {productColorFieldOptionsError ? (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              Грешка при зареждане на избрани цветове: {productColorFieldOptionsError.message}
            </div>
          ) : null}

          {activeTab === "categories" ? (
            <article className="rounded-xl border border-boutique-line bg-boutique-paper p-6 shadow-boutique-sm md:p-8">
            <h2 className="font-heading text-2xl text-boutique-ink">Управление на категории</h2>
            <p className="mt-2 text-sm text-boutique-muted">
              Добавяйте, редактирайте и изтривайте категории. Тези категории се използват във
              формата за продуктите.
            </p>

            <form action={createCategory} className="mt-6 grid gap-4 md:grid-cols-[1fr_1fr_auto]">
              <input type="hidden" name="tab" value="categories" />
              <label className="text-sm font-medium text-boutique-ink">
                Име на категория
                <input
                  name="name"
                  required
                  placeholder="Напр. Сватба"
                  className={fieldClass}
                />
              </label>
              <label className="text-sm font-medium text-boutique-ink">
                Slug
                <input
                  name="slug"
                  required
                  placeholder="napr-svatba"
                  className={fieldClass}
                />
              </label>
              <div className="self-end">
                <button
                  type="submit"
                  className="rounded-full bg-boutique-ink px-5 py-3 text-xs font-semibold uppercase tracking-wider text-boutique-paper transition hover:bg-boutique-accent"
                >
                  Добави категория
                </button>
              </div>
            </form>

            {categories.length === 0 ? (
              <p className="mt-5 text-sm text-boutique-muted">Все още няма категории.</p>
            ) : (
              <ul className="mt-6 space-y-3">
                {categories.map((category) => (
                  <li
                    key={category.id}
                    className="rounded-lg border border-boutique-line/70 bg-boutique-bg p-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="font-medium text-boutique-ink">{category.name}</p>
                        <p className="text-xs text-boutique-muted">Slug: {category.slug}</p>
                      </div>
                      <form action={deleteCategory}>
                        <input type="hidden" name="tab" value="categories" />
                        <input type="hidden" name="id" value={category.id} />
                        <button
                          type="submit"
                          className="rounded-full border border-red-300 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-red-700 transition hover:bg-red-50"
                        >
                          Изтрий
                        </button>
                      </form>
                    </div>
                    <details className="mt-3 rounded-lg border border-boutique-line/70 bg-boutique-paper p-3">
                      <summary className="cursor-pointer text-sm font-semibold text-boutique-ink">
                        Редактирай категория
                      </summary>
                      <form action={updateCategory} className="mt-4 grid gap-4 md:grid-cols-[1fr_1fr_auto]">
                        <input type="hidden" name="tab" value="categories" />
                        <input type="hidden" name="id" value={category.id} />
                        <label className="text-sm font-medium text-boutique-ink">
                          Име на категория
                          <input
                            name="name"
                            required
                            defaultValue={category.name}
                            className={fieldClass}
                          />
                        </label>
                        <label className="text-sm font-medium text-boutique-ink">
                          Slug
                          <input
                            name="slug"
                            required
                            defaultValue={category.slug}
                            className={fieldClass}
                          />
                        </label>
                        <div className="self-end">
                          <button
                            type="submit"
                            className="rounded-full bg-boutique-ink px-5 py-3 text-xs font-semibold uppercase tracking-wider text-boutique-paper transition hover:bg-boutique-accent"
                          >
                            Запази
                          </button>
                        </div>
                      </form>
                    </details>
                  </li>
                ))}
              </ul>
            )}
            </article>
          ) : null}

          {activeTab === "products" ? (
            <article className="rounded-xl border border-boutique-line bg-boutique-paper p-6 shadow-boutique-sm md:p-8">
            <h2 className="font-heading text-2xl text-boutique-ink">Добавяне на продукт</h2>
            <p className="mt-2 text-sm text-boutique-muted">
              Попълнете основните данни за продукта. Полетата са организирани по секции за по-лесна
              работа.
            </p>

            <form action={createProduct} className="mt-7 space-y-7">
              <input type="hidden" name="tab" value="products" />
              <fieldset className="space-y-4">
                <legend className="text-xs font-semibold uppercase tracking-[0.16em] text-boutique-muted">
                  Основна информация
                </legend>
                <div className="grid gap-5 md:grid-cols-2">
                  <label className="text-sm font-medium text-boutique-ink">
                    Име на продукта
                    <input
                      name="name"
                      required
                      defaultValue={draft?.name ?? ""}
                      className={fieldClass}
                      placeholder="Напр. Гравирана рамка"
                    />
                    <p className={helperClass}>Кратко и ясно име, което ще се вижда в магазина.</p>
                  </label>

                  <label className="text-sm font-medium text-boutique-ink">
                    Цена (евро)
                    <input
                      name="price"
                      type="number"
                      step="0.01"
                      min="0"
                      required
                      defaultValue={draft?.price ?? ""}
                      className={fieldClass}
                      placeholder="0.00"
                    />
                    <p className={helperClass}>Въведете стойност в EUR, например 29.90.</p>
                  </label>

                  <label className="text-sm font-medium text-boutique-ink md:col-span-2">
                    Описание
                    <textarea
                      name="description"
                      rows={4}
                      required
                      defaultValue={draft?.description ?? ""}
                      className={`${fieldClass} resize-y`}
                      placeholder="Опишете материала, повода и идеята на продукта..."
                    />
                    <p className={helperClass}>Този текст се показва в продуктовата страница.</p>
                  </label>

                  <label className="text-sm font-medium text-boutique-ink md:col-span-2">
                    Допълнителна информация
                    <textarea
                      name="additional_info"
                      rows={3}
                      defaultValue={draft?.additionalInfo ?? ""}
                      className={`${fieldClass} resize-y`}
                      placeholder="Допълнителни детайли за материала, размери, поддръжка..."
                    />
                    <p className={helperClass}>Показва се в продуктовата страница под описанието.</p>
                  </label>
                </div>
              </fieldset>

              <fieldset className="space-y-4 border-t border-boutique-line/70 pt-6">
                <legend className="text-xs font-semibold uppercase tracking-[0.16em] text-boutique-muted">
                  Визия и категория
                </legend>
                <div className="grid gap-5 md:grid-cols-2">
                  <ImageFileInput
                    name="image_file"
                    label="Изображение на продукта"
                    className={fieldClass}
                    helperClassName={helperClass}
                    helperText="Качи файл (PNG, JPG, WEBP или SVG, до 5 MB). Файлът се записва в Supabase Storage."
                  />

                  <fieldset className="rounded-lg border border-boutique-line/70 bg-boutique-bg p-3">
                    <legend className="px-1 text-sm font-medium text-boutique-ink">Категории</legend>
                    {categories.length === 0 ? (
                      <p className={helperClass}>Няма налични категории. Добавете категории от секцията по-горе.</p>
                    ) : (
                      <div className="mt-2 grid gap-2 sm:grid-cols-2">
                        {categories.map((category) => (
                          <label key={category.id} className="inline-flex items-center gap-2 text-sm text-boutique-ink">
                            <input
                              name="category_ids"
                              type="checkbox"
                              value={category.id}
                              defaultChecked={draft?.categoryIds.includes(category.id)}
                              className="h-4 w-4 rounded border-boutique-line text-boutique-accent"
                            />
                            {category.name}
                          </label>
                        ))}
                      </div>
                    )}
                    <p className={helperClass}>Може да изберете повече от една категория.</p>
                  </fieldset>
                </div>
              </fieldset>

              <fieldset className="space-y-4 border-t border-boutique-line/70 pt-6">
                <legend className="text-xs font-semibold uppercase tracking-[0.16em] text-boutique-muted">
                  Допълнителни настройки
                </legend>
                <label className="inline-flex items-center gap-2 text-sm text-boutique-ink">
                  <input
                    name="is_customizable"
                    type="checkbox"
                    defaultChecked={draft?.isCustomizable}
                    className="h-4 w-4 rounded border-boutique-line text-boutique-accent"
                  />
                  Продуктът е персонализируем
                </label>
                <label className="text-sm font-medium text-boutique-ink">
                  Бележка за доставка/изработка
                  <textarea
                    name="fulfillment_note"
                    rows={2}
                    defaultValue={draft?.fulfillmentNote ?? ""}
                    className={`${fieldClass} resize-y`}
                    placeholder="Напр. Изпращане за 5-10 работни дни..."
                  />
                  <p className={helperClass}>Кратка бележка за срок, изработка или потвърждение.</p>
                </label>
              </fieldset>

              <fieldset className="space-y-4 border-t border-boutique-line/70 pt-6">
                <legend className="text-xs font-semibold uppercase tracking-[0.16em] text-boutique-muted">
                  Цветови настройки
                </legend>
                <ProductColorFieldsEditor
                  colorGroups={colorGroups}
                  colorOptions={colorOptions}
                  initialFields={draft?.colorFields}
                  helperClassName={helperClass}
                  fieldClassName={fieldClass}
                />
              </fieldset>

              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-boutique-line/70 pt-6">
                <p className="text-xs uppercase tracking-[0.16em] text-boutique-muted">
                  Всички задължителни полета са отбелязани в секциите.
                </p>
                <div className="flex flex-wrap gap-2">
                  <a
                    href={makeTabHref("products")}
                    className="rounded-full border border-boutique-line px-5 py-3 text-xs font-semibold uppercase tracking-wider text-boutique-ink transition hover:border-boutique-accent/40"
                  >
                    Изчисти
                  </a>
                  <button
                    type="submit"
                    disabled={categories.length === 0}
                    className="rounded-full bg-boutique-ink px-6 py-3 text-xs font-semibold uppercase tracking-wider text-boutique-paper transition hover:bg-boutique-accent"
                  >
                    Добави продукт
                  </button>
                </div>
              </div>
            </form>
            </article>
          ) : null}

          {activeTab === "products" ? (
            <article className="rounded-xl border border-boutique-line bg-boutique-paper p-6 shadow-boutique-sm md:p-8">
            <h2 className="font-heading text-2xl text-boutique-ink">Всички продукти</h2>

            {products.length === 0 ? (
              <p className="mt-5 text-sm text-boutique-muted">Няма добавени продукти.</p>
            ) : (
              <ul className="mt-6 space-y-5">
                {products.map((product) => {
                  const assignedIds = categoryIdsByProductId.get(product.id) ?? [];
                  const assignedCategories = assignedIds
                    .map((categoryId) => categoryById.get(categoryId))
                    .filter((category): category is CategoryRow => Boolean(category));
                  const colorFieldsForProduct = (colorFieldsByProductId.get(product.id) ?? [])
                    .filter((field) => field.enabled)
                    .map((field) => {
                      const group = colorGroupById.get(field.group_id);
                      const selectedOptionIds = selectedColorOptionIdsByFieldId.get(field.id) ?? new Set<string>();
                      const selectedOptionLabels = [...selectedOptionIds]
                        .map((optionId) => colorOptionById.get(optionId)?.name)
                        .filter((name): name is string => Boolean(name));
                      return {
                        field,
                        groupLabel: group?.label ?? "Цветове",
                        selectedOptionLabels,
                      };
                    });
                  const initialColorFields = (colorFieldsByProductId.get(product.id) ?? [])
                    .filter((field) => field.enabled)
                    .map((field) => ({
                      label: field.label,
                      groupId: field.group_id,
                      minSelect: field.min_select,
                      maxSelect: field.max_select,
                      optionIds: [...(selectedColorOptionIdsByFieldId.get(field.id) ?? new Set<string>())],
                    }));

                  return (
                    <li
                      key={product.id}
                      className="rounded-xl border border-boutique-line/80 bg-boutique-bg p-4 md:p-5"
                    >
                      <div className="grid gap-4 md:grid-cols-[120px_1fr]">
                        <div className="h-24 w-full overflow-hidden rounded-lg border border-boutique-line bg-white md:h-28">
                          {product.image_url ? (
                            <div
                              className="h-full w-full bg-cover bg-center"
                              style={{ backgroundImage: `url(${product.image_url})` }}
                            />
                          ) : (
                            <div className="grid h-full w-full place-items-center text-xs text-boutique-muted">
                              Няма снимка
                            </div>
                          )}
                        </div>

                        <div>
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <h3 className="font-heading text-xl text-boutique-ink">{product.name}</h3>
                            <p className="font-medium text-boutique-ink">
                              {Number(product.price).toFixed(2)} €
                            </p>
                          </div>
                          <div className="mt-2 flex flex-wrap gap-2">
                            {assignedCategories.length === 0 ? (
                              <span className="rounded-full border border-boutique-line px-2.5 py-1 text-xs text-boutique-muted">
                                Без категория
                              </span>
                            ) : (
                              assignedCategories.map((category) => (
                                <span
                                  key={`${product.id}-${category.id}`}
                                  className="rounded-full border border-boutique-line px-2.5 py-1 text-xs text-boutique-ink"
                                >
                                  {category.name}
                                </span>
                              ))
                            )}
                          </div>
                          {colorFieldsForProduct.length > 0 ? (
                            <div className="mt-2 space-y-1 text-xs text-boutique-muted">
                              {colorFieldsForProduct.map(({ field, groupLabel, selectedOptionLabels }) => (
                                <p key={`${product.id}-${field.id}`}>
                                  {field.label} ({groupLabel}): {field.min_select}-{field.max_select} избора
                                  {selectedOptionLabels.length > 0
                                    ? ` · ${selectedOptionLabels.join(", ")}`
                                    : ""}
                                </p>
                              ))}
                            </div>
                          ) : null}
                          <p className="mt-3 text-sm leading-relaxed text-boutique-muted">
                            {product.description}
                          </p>
                          {product.additional_info ? (
                            <p className="mt-2 text-sm leading-relaxed text-boutique-muted/90">
                              {product.additional_info}
                            </p>
                          ) : null}
                          {product.fulfillment_note ? (
                            <p className="mt-2 text-xs leading-relaxed text-boutique-muted">
                              {product.fulfillment_note}
                            </p>
                          ) : null}

                          <div className="mt-4 flex flex-wrap gap-2">
                            <form action={deleteProduct}>
                              <input type="hidden" name="tab" value="products" />
                              <input type="hidden" name="id" value={product.id} />
                              <button
                                type="submit"
                                className="rounded-full border border-red-300 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-red-700 transition hover:bg-red-50"
                              >
                                Изтрий
                              </button>
                            </form>
                          </div>
                        </div>
                      </div>

                      <details className="mt-4 rounded-lg border border-boutique-line/70 bg-boutique-paper p-3">
                        <summary className="cursor-pointer text-sm font-semibold text-boutique-ink">
                          Редактирай продукт
                        </summary>
                        <form action={updateProduct} className="mt-4 grid gap-4 md:grid-cols-2">
                          <input type="hidden" name="tab" value="products" />
                          <input type="hidden" name="id" value={product.id} />
                          <input type="hidden" name="existing_image_url" value={product.image_url ?? ""} />

                          <label className="text-sm font-medium text-boutique-ink">
                            Име
                            <input name="name" defaultValue={product.name} required className={fieldClass} />
                          </label>

                          <label className="text-sm font-medium text-boutique-ink">
                            Цена (евро)
                            <input
                              name="price"
                              type="number"
                              step="0.01"
                              min="0"
                              defaultValue={product.price}
                              required
                              className={fieldClass}
                            />
                          </label>

                          <label className="text-sm font-medium text-boutique-ink md:col-span-2">
                            Описание
                            <textarea
                              name="description"
                              rows={3}
                              defaultValue={product.description}
                              required
                              className={`${fieldClass} resize-y`}
                            />
                          </label>

                          <label className="text-sm font-medium text-boutique-ink md:col-span-2">
                            Допълнителна информация
                            <textarea
                              name="additional_info"
                              rows={3}
                              defaultValue={product.additional_info ?? ""}
                              className={`${fieldClass} resize-y`}
                            />
                          </label>

                          <ImageFileInput
                            name="image_file"
                            label="Нова снимка (по избор)"
                            className={fieldClass}
                            helperClassName={helperClass}
                            helperText="Ако не качите нов файл, ще остане текущото изображение. Формати: PNG, JPG, WEBP или SVG (до 5 MB)."
                          />

                          <fieldset className="rounded-lg border border-boutique-line/70 bg-boutique-bg p-3 md:col-span-2">
                            <legend className="px-1 text-sm font-medium text-boutique-ink">Категории</legend>
                            {categories.length === 0 ? (
                              <p className={helperClass}>Няма налични категории.</p>
                            ) : (
                              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                                {categories.map((category) => (
                                  <label
                                    key={`${product.id}-${category.id}-edit`}
                                    className="inline-flex items-center gap-2 text-sm text-boutique-ink"
                                  >
                                    <input
                                      name="category_ids"
                                      type="checkbox"
                                      value={category.id}
                                      defaultChecked={assignedIds.includes(category.id)}
                                      className="h-4 w-4 rounded border-boutique-line text-boutique-accent"
                                    />
                                    {category.name}
                                  </label>
                                ))}
                              </div>
                            )}
                          </fieldset>

                          <fieldset className="space-y-3 rounded-lg border border-boutique-line/70 bg-boutique-bg p-3 md:col-span-2">
                            <legend className="px-1 text-sm font-medium text-boutique-ink">Цветови настройки</legend>
                            <ProductColorFieldsEditor
                              colorGroups={colorGroups}
                              colorOptions={colorOptions}
                              initialFields={initialColorFields}
                              helperClassName={helperClass}
                              fieldClassName={fieldClass}
                            />
                          </fieldset>

                          <label className="inline-flex items-center gap-2 text-sm text-boutique-ink md:col-span-2">
                            <input
                              name="is_customizable"
                              type="checkbox"
                              defaultChecked={product.is_customizable}
                              className="h-4 w-4 rounded border-boutique-line text-boutique-accent"
                            />
                            Продуктът е персонализируем
                          </label>

                          <label className="text-sm font-medium text-boutique-ink md:col-span-2">
                            Бележка за доставка/изработка
                            <textarea
                              name="fulfillment_note"
                              rows={2}
                              defaultValue={product.fulfillment_note ?? ""}
                              className={`${fieldClass} resize-y`}
                            />
                          </label>

                          <div className="md:col-span-2">
                            <button
                              type="submit"
                              className="rounded-full bg-boutique-ink px-5 py-2.5 text-xs font-semibold uppercase tracking-wider text-boutique-paper transition hover:bg-boutique-accent"
                            >
                              Запази промените
                            </button>
                          </div>
                        </form>
                      </details>
                    </li>
                  );
                })}
              </ul>
            )}
            </article>
          ) : null}
        </div>
      </PageContainer>
    </section>
  );
}
