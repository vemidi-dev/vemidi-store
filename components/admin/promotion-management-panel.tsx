import {
  deleteProductPromotion,
  updateProductPromotion,
} from "@/app/admin/promotion-actions";
import { PromotionCreateForm } from "@/components/admin/promotion-create-form";
import { PromotionPricePreview } from "@/components/admin/promotion-price-preview";
import { adminFieldClass, adminPanelClass } from "@/components/admin/styles";
import { adminFormFields } from "@/lib/admin/form-fields";
import type { ProductRow } from "@/lib/admin/types";
import { formatEur } from "@/lib/format-eur";
import {
  isPromotionActive,
  resolveProductPricing,
  type ProductPromotionRow,
} from "@/lib/product-pricing";

function toDateTimeLocal(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function formatPromotionStatus(promotion: ProductPromotionRow) {
  if (!promotion.is_active) {
    return "Неактивна";
  }

  if (isPromotionActive(promotion)) {
    return "Активна сега";
  }

  const now = Date.now();
  if (new Date(promotion.starts_at).getTime() > now) {
    return "Предстояща";
  }

  return "Изтекла";
}

function IconTrash({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M3 6h18" />
      <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
    </svg>
  );
}

export function PromotionManagementPanel({
  products,
  promotions,
}: {
  products: ProductRow[];
  promotions: ProductPromotionRow[];
}) {
  const productById = new Map(products.map((product) => [product.id, product]));

  return (
    <article className={`${adminPanelClass} !p-5 md:!p-6`}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 className="font-heading text-xl text-boutique-ink">Промоции</h2>
        {promotions.length > 0 ? (
          <span className="text-xs text-boutique-muted">
            {promotions.length}{" "}
            {promotions.length === 1 ? "промоция" : "промоции"}
          </span>
        ) : null}
      </div>
      <p className="mt-1 text-xs leading-relaxed text-boutique-muted">
        Намаленията са валидни само в зададения период. Активната цена се
        изчислява сървърно при checkout.
      </p>

      {products.length === 0 ? (
        <p className="mt-4 text-sm text-boutique-muted">
          Няма продукти, към които да добавите промоция.
        </p>
      ) : (
        <PromotionCreateForm products={products} />
      )}

      <div className="mt-5 grid gap-3">
        {promotions.map((promotion) => {
          const product = productById.get(promotion.product_id);
          const pricing = product
            ? resolveProductPricing(Number(product.price), promotion)
            : null;
          const status = formatPromotionStatus(promotion);

          return (
            <article
              key={promotion.id}
              className="rounded-lg border border-boutique-line bg-white p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-medium text-boutique-ink">{promotion.name}</p>
                  <p className="mt-1 text-xs text-boutique-muted">
                    {product?.name ?? "Неизвестен продукт"}
                  </p>
                  <p className="mt-1 text-[11px] text-boutique-sage-deep">{status}</p>
                </div>
                <form action={deleteProductPromotion}>
                  <input
                    type="hidden"
                    name={adminFormFields.promotion.id}
                    value={promotion.id}
                  />
                  <button
                    type="submit"
                    aria-label="Изтрий"
                    title="Изтрий"
                    className="rounded-md p-1 text-red-600 opacity-60 transition hover:bg-red-50 hover:opacity-100"
                  >
                    <IconTrash className="h-3.5 w-3.5" />
                  </button>
                </form>
              </div>

              {product && pricing ? (
                <div className="mt-3">
                  <PromotionPricePreview
                    basePrice={Number(product.price)}
                    discountType={promotion.discount_type}
                    discountValue={Number(promotion.discount_value)}
                  />
                </div>
              ) : null}

              <form action={updateProductPromotion} className="mt-4 grid gap-3">
                <input
                  type="hidden"
                  name={adminFormFields.promotion.id}
                  value={promotion.id}
                />

                <div className="grid gap-3 md:grid-cols-2">
                  <label className="text-xs font-medium text-boutique-ink">
                    Продукт
                    <select
                      name={adminFormFields.promotion.productId}
                      required
                      defaultValue={promotion.product_id}
                      className={adminFieldClass}
                    >
                      {products.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name} ({formatEur(item.price)})
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="text-xs font-medium text-boutique-ink">
                    Име
                    <input
                      name={adminFormFields.promotion.name}
                      required
                      defaultValue={promotion.name}
                      className={adminFieldClass}
                    />
                  </label>
                </div>

                <div className="grid gap-3 md:grid-cols-3">
                  <label className="text-xs font-medium text-boutique-ink">
                    Тип
                    <select
                      name={adminFormFields.promotion.discountType}
                      required
                      defaultValue={promotion.discount_type}
                      className={adminFieldClass}
                    >
                      <option value="percentage">Процент (%)</option>
                      <option value="fixed_price">Фиксирана крайна цена</option>
                    </select>
                  </label>

                  <label className="text-xs font-medium text-boutique-ink">
                    Стойност
                    <input
                      name={adminFormFields.promotion.discountValue}
                      required
                      defaultValue={Number(promotion.discount_value)}
                      className={adminFieldClass}
                    />
                  </label>

                  <label className="flex items-end gap-2 pb-2 text-xs font-medium text-boutique-ink">
                    <input
                      name={adminFormFields.promotion.isActive}
                      type="checkbox"
                      defaultChecked={promotion.is_active}
                      className="h-4 w-4 rounded border-boutique-line text-boutique-sage-deep"
                    />
                    Активна
                  </label>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <label className="text-xs font-medium text-boutique-ink">
                    Начало
                    <input
                      name={adminFormFields.promotion.startsAt}
                      type="datetime-local"
                      required
                      defaultValue={toDateTimeLocal(promotion.starts_at)}
                      className={adminFieldClass}
                    />
                  </label>
                  <label className="text-xs font-medium text-boutique-ink">
                    Край
                    <input
                      name={adminFormFields.promotion.endsAt}
                      type="datetime-local"
                      required
                      defaultValue={toDateTimeLocal(promotion.ends_at)}
                      className={adminFieldClass}
                    />
                  </label>
                </div>

                <div className="flex justify-end">
                  <button className="rounded-full border border-boutique-line px-4 py-2 text-xs font-semibold text-boutique-ink transition hover:border-boutique-accent/40">
                    Запази промоцията
                  </button>
                </div>
              </form>
            </article>
          );
        })}
      </div>
    </article>
  );
}
