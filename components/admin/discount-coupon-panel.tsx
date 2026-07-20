import Link from "next/link";

import {
  createDiscountCoupon,
  setDiscountCouponActive,
} from "@/app/admin/coupon-actions";
import { adminFieldClass, adminPanelClass } from "@/components/admin/styles";
import { adminFormFields } from "@/lib/admin/form-fields";
import type { DiscountCouponRow } from "@/lib/admin/types";

export type DiscountCouponOrderInfo = {
  id: string;
  shortId: string;
  customerName: string;
  customerEmail: string | null;
  customerPhone: string;
};

function formatUsedAt(value: string | null) {
  if (!value) {
    return "—";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString("bg-BG");
}

export function DiscountCouponPanel({
  coupons,
  ordersById,
  loadError,
}: {
  coupons: DiscountCouponRow[];
  ordersById: Record<string, DiscountCouponOrderInfo>;
  loadError: string | null;
}) {
  return (
    <article className={`${adminPanelClass} !p-5 md:!p-6`}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 className="font-heading text-xl text-boutique-ink">Купони за отстъпка</h2>
        <span className="text-xs text-boutique-muted">{coupons.length} кода</span>
      </div>
      <p className="mt-1 text-xs leading-relaxed text-boutique-muted">
        Еднократни процентни кодове за цялата поръчка. Валидират се сървърно при checkout.
      </p>

      {loadError ? (
        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Купоните не могат да бъдат заредени. Изпълнете{" "}
          <strong>discount_coupons.sql</strong> в Supabase.
          {loadError ? ` (${loadError})` : null}
        </div>
      ) : null}

      <form action={createDiscountCoupon} className="mt-5 grid gap-3 sm:grid-cols-4">
        <label className="text-xs font-semibold uppercase tracking-wider text-boutique-muted sm:col-span-1">
          Код
          <input
            name={adminFormFields.discountCoupon.code}
            required
            maxLength={32}
            placeholder="SAVE10"
            className={`${adminFieldClass} mt-1 uppercase`}
          />
        </label>
        <label className="text-xs font-semibold uppercase tracking-wider text-boutique-muted sm:col-span-1">
          Процент
          <input
            name={adminFormFields.discountCoupon.discountPercentage}
            required
            type="number"
            min={0.01}
            max={100}
            step="0.01"
            placeholder="10"
            className={`${adminFieldClass} mt-1`}
          />
        </label>
        <label className="flex items-end gap-2 pb-3 text-sm text-boutique-ink sm:col-span-1">
          <input
            type="checkbox"
            name={adminFormFields.discountCoupon.isActive}
            defaultChecked
            className="h-4 w-4 rounded border-boutique-line"
          />
          Активен
        </label>
        <div className="flex items-end sm:col-span-1">
          <button
            type="submit"
            className="w-full rounded-xl bg-boutique-ink px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-boutique-sage-deep"
          >
            Създай купон
          </button>
        </div>
      </form>

      {coupons.length === 0 && !loadError ? (
        <p className="mt-5 text-sm text-boutique-muted">Все още няма създадени купони.</p>
      ) : null}

      {coupons.length > 0 ? (
        <ul className="mt-5 divide-y divide-boutique-line overflow-hidden rounded-xl border border-boutique-line">
          {coupons.map((coupon) => {
            const used = Boolean(coupon.used_at || coupon.used_order_id);
            const orderInfo = coupon.used_order_id
              ? ordersById[coupon.used_order_id]
              : undefined;

            return (
              <li
                key={coupon.id}
                className="flex flex-col gap-3 bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0 space-y-1 text-sm">
                  <p className="font-semibold tracking-wide text-boutique-ink">
                    {coupon.code}{" "}
                    <span className="font-normal text-boutique-muted">
                      · {Number(coupon.discount_percentage)}%
                    </span>
                  </p>
                  <p className="text-xs text-boutique-muted">
                    {coupon.is_active ? "Активен" : "Неактивен"}
                    {" · "}
                    {used ? `Използван ${formatUsedAt(coupon.used_at)}` : "Неизползван"}
                  </p>
                  {used ? (
                    <div className="text-xs leading-relaxed text-boutique-muted">
                      {orderInfo ? (
                        <>
                          <p>
                            Поръчка{" "}
                            <Link
                              href={`/admin?tab=orders&order_id=${encodeURIComponent(orderInfo.id)}`}
                              className="font-semibold text-boutique-sage-deep underline-offset-2 hover:underline"
                            >
                              {orderInfo.shortId}
                            </Link>
                          </p>
                          <p>
                            {orderInfo.customerName}
                            {orderInfo.customerPhone ? ` · ${orderInfo.customerPhone}` : ""}
                            {orderInfo.customerEmail ? ` · ${orderInfo.customerEmail}` : ""}
                          </p>
                        </>
                      ) : coupon.used_order_id ? (
                        <p>
                          Поръчка{" "}
                          <Link
                            href={`/admin?tab=orders&order_id=${encodeURIComponent(coupon.used_order_id)}`}
                            className="font-semibold text-boutique-sage-deep underline-offset-2 hover:underline"
                          >
                            {coupon.used_order_id.slice(0, 8).toUpperCase()}
                          </Link>
                        </p>
                      ) : null}
                    </div>
                  ) : null}
                </div>
                {!used ? (
                  <form action={setDiscountCouponActive}>
                    <input
                      type="hidden"
                      name={adminFormFields.discountCoupon.id}
                      value={coupon.id}
                    />
                    <input
                      type="hidden"
                      name={adminFormFields.discountCoupon.isActive}
                      value={coupon.is_active ? "false" : "true"}
                    />
                    <button
                      type="submit"
                      className="rounded-lg border border-boutique-line px-3 py-1.5 text-xs font-semibold text-boutique-ink transition hover:border-boutique-sage/40"
                    >
                      {coupon.is_active ? "Деактивирай" : "Активирай"}
                    </button>
                  </form>
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : null}
    </article>
  );
}
