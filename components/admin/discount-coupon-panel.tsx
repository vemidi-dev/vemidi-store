"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import {
  createDiscountCouponBatch,
  createDiscountCoupon,
  setDiscountCouponActive,
} from "@/app/admin/coupon-actions";
import { adminFieldClass, adminPanelClass } from "@/components/admin/styles";
import { adminFormFields } from "@/lib/admin/form-fields";
import type { DiscountCouponRow } from "@/lib/admin/types";
import { isCouponExpired } from "@/lib/checkout/coupon";

export type DiscountCouponOrderInfo = {
  id: string;
  shortId: string;
  customerName: string;
  customerEmail: string | null;
  customerPhone: string;
};

type CouponStatusFilter =
  | "all"
  | "available"
  | "active"
  | "inactive"
  | "unused"
  | "used"
  | "expired";

function formatDateTime(value: string | null) {
  if (!value) {
    return "—";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString("bg-BG");
}

function formatExpiryLabel(expiresAt: string | null) {
  if (!expiresAt) {
    return "Без срок";
  }

  if (isCouponExpired(expiresAt)) {
    return `Изтекъл ${formatDateTime(expiresAt)}`;
  }

  return `Валиден до ${formatDateTime(expiresAt)}`;
}

function getCouponState(coupon: DiscountCouponRow) {
  const used = Boolean(coupon.used_at || coupon.used_order_id);
  const expired = isCouponExpired(coupon.expires_at);
  const available = coupon.is_active && !used && !expired;

  return { available, expired, used };
}

function matchesStatusFilter(coupon: DiscountCouponRow, status: CouponStatusFilter) {
  const { available, expired, used } = getCouponState(coupon);

  switch (status) {
    case "available":
      return available;
    case "active":
      return coupon.is_active;
    case "inactive":
      return !coupon.is_active;
    case "unused":
      return !used;
    case "used":
      return used;
    case "expired":
      return expired;
    case "all":
    default:
      return true;
  }
}

function getStatusSummary(coupons: DiscountCouponRow[]) {
  return coupons.reduce(
    (summary, coupon) => {
      const { available, expired, used } = getCouponState(coupon);

      return {
        total: summary.total + 1,
        available: summary.available + (available ? 1 : 0),
        active: summary.active + (coupon.is_active ? 1 : 0),
        unused: summary.unused + (!used ? 1 : 0),
        used: summary.used + (used ? 1 : 0),
        expired: summary.expired + (expired ? 1 : 0),
      };
    },
    { total: 0, available: 0, active: 0, unused: 0, used: 0, expired: 0 },
  );
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
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<CouponStatusFilter>("all");
  const summary = useMemo(() => getStatusSummary(coupons), [coupons]);
  const filteredCoupons = useMemo(() => {
    const normalizedQuery = query.trim().toUpperCase();

    return coupons.filter((coupon) => {
      if (!matchesStatusFilter(coupon, statusFilter)) {
        return false;
      }

      if (!normalizedQuery) {
        return true;
      }

      const orderInfo = coupon.used_order_id ? ordersById[coupon.used_order_id] : undefined;
      return [
        coupon.code,
        coupon.used_order_id ?? "",
        orderInfo?.shortId ?? "",
        orderInfo?.customerName ?? "",
        orderInfo?.customerEmail ?? "",
        orderInfo?.customerPhone ?? "",
      ]
        .join(" ")
        .toUpperCase()
        .includes(normalizedQuery);
    });
  }, [coupons, ordersById, query, statusFilter]);

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

      <form action={createDiscountCoupon} className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <label className="text-xs font-semibold uppercase tracking-wider text-boutique-muted">
          Код
          <input
            name={adminFormFields.discountCoupon.code}
            required
            maxLength={32}
            placeholder="SAVE10"
            className={`${adminFieldClass} mt-1 uppercase`}
          />
        </label>
        <label className="text-xs font-semibold uppercase tracking-wider text-boutique-muted">
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
        <label className="text-xs font-semibold uppercase tracking-wider text-boutique-muted">
          Валиден до
          <input
            name={adminFormFields.discountCoupon.expiresAt}
            type="datetime-local"
            className={`${adminFieldClass} mt-1`}
          />
        </label>
        <label className="flex items-end gap-2 pb-3 text-sm text-boutique-ink">
          <input
            type="checkbox"
            name={adminFormFields.discountCoupon.isActive}
            defaultChecked
            className="h-4 w-4 rounded border-boutique-line"
          />
          Активен
        </label>
        <div className="flex items-end">
          <button
            type="submit"
            className="w-full rounded-xl bg-boutique-ink px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-boutique-sage-deep"
          >
            Създай купон
          </button>
        </div>
      </form>

      <section className="mt-5 rounded-2xl border border-boutique-line bg-boutique-blush/20 p-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="font-heading text-lg text-boutique-ink">Създай серия купони</h3>
          <p className="text-xs text-boutique-muted">Автоматично генерирани уникални кодове.</p>
        </div>
        <form
          action={createDiscountCouponBatch}
          className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-6"
        >
          <label className="text-xs font-semibold uppercase tracking-wider text-boutique-muted">
            Префикс
            <input
              name={adminFormFields.discountCoupon.bulkPrefix}
              required
              maxLength={26}
              placeholder="FRIEND"
              className={`${adminFieldClass} mt-1 uppercase`}
            />
          </label>
          <label className="text-xs font-semibold uppercase tracking-wider text-boutique-muted">
            Брой
            <input
              name={adminFormFields.discountCoupon.bulkCount}
              required
              type="number"
              min={1}
              max={100}
              step={1}
              defaultValue={10}
              className={`${adminFieldClass} mt-1`}
            />
          </label>
          <label className="text-xs font-semibold uppercase tracking-wider text-boutique-muted">
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
          <label className="text-xs font-semibold uppercase tracking-wider text-boutique-muted">
            Валидни до
            <input
              name={adminFormFields.discountCoupon.expiresAt}
              type="datetime-local"
              className={`${adminFieldClass} mt-1`}
            />
          </label>
          <label className="flex items-end gap-2 pb-3 text-sm text-boutique-ink">
            <input
              type="checkbox"
              name={adminFormFields.discountCoupon.isActive}
              defaultChecked
              className="h-4 w-4 rounded border-boutique-line"
            />
            Активни
          </label>
          <div className="flex items-end">
            <button
              type="submit"
              className="w-full rounded-xl bg-boutique-sage-deep px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-boutique-ink"
            >
              Създай серия
            </button>
          </div>
        </form>
        <p className="mt-3 text-xs leading-relaxed text-boutique-muted">
          Пример: префикс <strong>FRIEND</strong> създава кодове като FRIEND8K2M. Кодовете са само
          с главни букви и цифри, за да работят безпроблемно в checkout.
        </p>
      </section>

      {coupons.length === 0 && !loadError ? (
        <p className="mt-5 text-sm text-boutique-muted">Все още няма създадени купони.</p>
      ) : null}

      {coupons.length > 0 ? (
        <>
          <div className="mt-5 grid gap-3 rounded-2xl border border-boutique-line bg-white p-4 lg:grid-cols-[minmax(0,1fr)_240px]">
            <label className="text-xs font-semibold uppercase tracking-wider text-boutique-muted">
              Търсене
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Код, клиент, телефон или поръчка"
                className={`${adminFieldClass} mt-1`}
              />
            </label>
            <label className="text-xs font-semibold uppercase tracking-wider text-boutique-muted">
              Статус
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value as CouponStatusFilter)}
                className={`${adminFieldClass} mt-1`}
              >
                <option value="all">Всички ({summary.total})</option>
                <option value="available">Готови за ползване ({summary.available})</option>
                <option value="active">Активни ({summary.active})</option>
                <option value="inactive">
                  Неактивни ({summary.total - summary.active})
                </option>
                <option value="unused">Неизползвани ({summary.unused})</option>
                <option value="used">Използвани ({summary.used})</option>
                <option value="expired">Изтекли ({summary.expired})</option>
              </select>
            </label>
            <div className="flex flex-wrap gap-2 text-xs text-boutique-muted lg:col-span-2">
              <span>{filteredCoupons.length} показани</span>
              <span>·</span>
              <span>{summary.available} готови за ползване</span>
              <span>·</span>
              <span>{summary.used} използвани</span>
              <span>·</span>
              <span>{summary.expired} изтекли</span>
            </div>
          </div>
          {filteredCoupons.length === 0 ? (
            <p className="mt-4 rounded-xl border border-boutique-line bg-white px-4 py-3 text-sm text-boutique-muted">
              Няма купони, които отговарят на избраните филтри.
            </p>
          ) : null}
          <ul className="mt-5 divide-y divide-boutique-line overflow-hidden rounded-xl border border-boutique-line">
            {filteredCoupons.map((coupon) => {
              const { expired, used } = getCouponState(coupon);
              const orderInfo = coupon.used_order_id
                ? ordersById[coupon.used_order_id]
                : undefined;

              return (
                <li
                  key={coupon.id}
                  className={`flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between ${
                    expired ? "bg-amber-50/70" : "bg-white"
                  }`}
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
                      {used ? `Използван ${formatDateTime(coupon.used_at)}` : "Неизползван"}
                      {" · "}
                      <span className={expired ? "font-semibold text-amber-800" : undefined}>
                        {formatExpiryLabel(coupon.expires_at)}
                      </span>
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
        </>
      ) : null}
    </article>
  );
}
