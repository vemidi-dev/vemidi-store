import {
  deleteProductPromotion,
  updateProductPromotion,
} from "@/app/admin/promotion-actions";
import { AdminConfirmForm } from "@/components/admin/admin-confirm-form";
import { PromotionCampaignCreateForm } from "@/components/admin/promotion-campaign-create-form";
import { PromotionCampaignList } from "@/components/admin/promotion-campaign-list";
import { PromotionPricePreview } from "@/components/admin/promotion-price-preview";
import { adminFieldClass, adminPanelClass } from "@/components/admin/styles";
import { adminFormFields } from "@/lib/admin/form-fields";
import type { CategoryType } from "@/lib/admin/types";
import { formatEur } from "@/lib/format-eur";
import {
  formatPromotionLifecycleStatus,
  type PromotionProductOption,
} from "@/lib/promotion-admin";
import {
  resolveProductPricing,
  type ProductPromotionRow,
  type PromotionCampaignRow,
} from "@/lib/product-pricing";

type PromotionCategoryOption = {
  id: string;
  name: string;
  categoryType: CategoryType;
};

function toDateTimeLocal(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
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
  categories,
  promotions,
  campaigns,
  campaignError,
}: {
  products: PromotionProductOption[];
  categories: PromotionCategoryOption[];
  promotions: ProductPromotionRow[];
  campaigns: PromotionCampaignRow[];
  campaignError: string | null;
}) {
  const productNamesById = new Map(products.map((product) => [product.id, product.name]));
  const productPricesById = new Map(products.map((product) => [product.id, product.price]));
  const legacyPromotions = promotions.filter((promotion) => !promotion.campaign_id);

  return (
    <article className={`${adminPanelClass} !p-5 md:!p-6`}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 className="font-heading text-xl text-boutique-ink">Промоции</h2>
        <span className="text-xs text-boutique-muted">
          {campaigns.length} кампании · {promotions.length} промоционални реда
        </span>
      </div>
      <p className="mt-1 text-xs leading-relaxed text-boutique-muted">
        Кампаниите групират процентни отстъпки за много продукти. Крайната цена се изчислява
        сървърно при checkout.
      </p>

      {products.length === 0 ? (
        <p className="mt-4 text-sm text-boutique-muted">
          Няма продукти, към които да добавите промоция.
        </p>
      ) : campaignError ? (
        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          За кампании изпълнете <strong>promotion_campaigns.sql</strong> в Supabase.
          Индивидуалните промоции продължават да работят.
        </div>
      ) : (
        <>
          {campaigns.length > 0 ? (
            <PromotionCampaignList
              campaigns={campaigns}
              promotions={promotions}
              productNamesById={productNamesById}
              productPricesById={productPricesById}
            />
          ) : (
            <p className="mt-4 text-sm text-boutique-muted">Все още няма създадени кампании.</p>
          )}

          <PromotionCampaignCreateForm
            products={products}
            categories={categories}
            existingPromotions={promotions}
          />
        </>
      )}

      <section className="mt-8">
        <h3 className="font-heading text-lg text-boutique-ink">Индивидуални промоции</h3>
        <p className="mt-1 text-xs text-boutique-muted">
          Отделни промоции извън кампании — поддържат процент или фиксирана крайна цена.
        </p>
        {legacyPromotions.length === 0 ? (
          <p className="mt-3 text-sm text-boutique-muted">
            Няма отделни промоции извън кампаниите.
          </p>
        ) : (
          <div className="mt-3 overflow-hidden rounded-xl border border-boutique-line">
            {legacyPromotions.map((promotion) => {
              const product = products.find((entry) => entry.id === promotion.product_id);
              const pricing = product
                ? resolveProductPricing(product.price, promotion)
                : null;
              const status = formatPromotionLifecycleStatus(promotion);

              return (
                <details
                  key={promotion.id}
                  className="border-b border-boutique-line/70 bg-white last:border-b-0"
                >
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-2.5 [&::-webkit-details-marker]:hidden">
                    <div className="min-w-0">
                      <p className="truncate font-medium text-boutique-ink">{promotion.name}</p>
                      <p className="truncate text-xs text-boutique-muted">
                        {product?.name ?? "Неизвестен продукт"} · {status}
                      </p>
                    </div>
                    {product && pricing ? (
                      <span className="shrink-0 text-xs text-boutique-accent">
                        {formatEur(pricing.price)}
                      </span>
                    ) : null}
                  </summary>

                  <div className="border-t border-boutique-line/60 bg-boutique-bg/35 px-3 py-3">
                    {product && pricing ? (
                      <PromotionPricePreview
                        basePrice={product.price}
                        discountType={promotion.discount_type}
                        discountValue={Number(promotion.discount_value)}
                      />
                    ) : null}

                    <form action={updateProductPromotion} className="mt-4 grid gap-3">
                      <input
                        type="hidden"
                        name={adminFormFields.promotion.id}
                        value={promotion.id}
                      />
                      <input
                        type="hidden"
                        name={adminFormFields.promotion.productId}
                        value={promotion.product_id}
                      />

                      <div className="grid gap-3 md:grid-cols-2">
                        <label className="text-xs font-medium text-boutique-ink">
                          Продукт
                          <span className="mt-2 block rounded-lg border border-boutique-line bg-white px-3 py-2 text-sm">
                            {product?.name ?? "Неизвестен продукт"}{" "}
                            {product ? `(${formatEur(product.price)})` : ""}
                          </span>
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

                      <button className="rounded-full border border-boutique-line px-4 py-2 text-xs font-semibold text-boutique-ink">
                        Запази промоцията
                      </button>
                    </form>

                    <AdminConfirmForm
                      action={deleteProductPromotion}
                      confirmMessage="Сигурни ли сте, че искате да изтриете тази промоция?"
                      className="mt-3 border-t border-red-100 pt-3"
                    >
                      <input
                        type="hidden"
                        name={adminFormFields.promotion.id}
                        value={promotion.id}
                      />
                      <button
                        type="submit"
                        className="inline-flex items-center gap-2 rounded-full border border-red-200 px-4 py-2 text-xs font-semibold text-red-700"
                      >
                        <IconTrash className="h-3.5 w-3.5" />
                        Изтрий промоцията
                      </button>
                    </AdminConfirmForm>
                  </div>
                </details>
              );
            })}
          </div>
        )}
      </section>
    </article>
  );
}
