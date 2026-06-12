"use client";

import { useMemo, useState } from "react";

import {
  deletePromotionCampaign,
  duplicatePromotionCampaign,
  setPromotionCampaignActive,
  updatePromotionCampaign,
} from "@/app/admin/promotion-actions";
import { AdminConfirmForm } from "@/components/admin/admin-confirm-form";
import { AdminOpenDetailsButton } from "@/components/admin/admin-open-details-button";
import {
  adminFieldClass,
  adminTableHeadClass,
} from "@/components/admin/styles";
import { adminFormFields } from "@/lib/admin/form-fields";
import { formatEur } from "@/lib/format-eur";
import {
  formatPromotionLifecycleStatus,
  getPromotionLifecycleStatus,
} from "@/lib/promotion-admin";
import type {
  ProductPromotionRow,
  PromotionCampaignRow,
} from "@/lib/product-pricing";

type PromotionCampaignListProps = {
  campaigns: PromotionCampaignRow[];
  promotions: ProductPromotionRow[];
  productNamesById: Map<string, string>;
  productPricesById: Map<string, number>;
};

type StatusFilter = "all" | "inactive" | "planned" | "active" | "ended";
type SortKey = "name-asc" | "name-desc" | "starts-asc" | "starts-desc";

const STATUS_BADGE: Record<string, string> = {
  active: "bg-emerald-100 text-emerald-800",
  planned: "bg-sky-100 text-sky-800",
  ended: "bg-boutique-bg text-boutique-muted",
  inactive: "bg-boutique-bg text-boutique-muted",
};

function toDateTimeLocal(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

export function PromotionCampaignList({
  campaigns,
  promotions,
  productNamesById,
  productPricesById,
}: PromotionCampaignListProps) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sortKey, setSortKey] = useState<SortKey>("starts-desc");

  const enriched = useMemo(() => {
    return campaigns.map((campaign) => {
      const campaignPromotions = promotions.filter(
        (promotion) => promotion.campaign_id === campaign.id,
      );
      const status = getPromotionLifecycleStatus(campaign);

      return {
        campaign,
        campaignPromotions,
        status,
        productCount: campaignPromotions.length,
      };
    });
  }, [campaigns, promotions]);

  const visibleCampaigns = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("bg");

    const filtered = enriched.filter((entry) => {
      const matchesQuery =
        !normalizedQuery ||
        entry.campaign.name.toLocaleLowerCase("bg").includes(normalizedQuery);
      const matchesStatus =
        statusFilter === "all" || entry.status === statusFilter;
      return matchesQuery && matchesStatus;
    });

    return [...filtered].sort((left, right) => {
      if (sortKey === "name-asc") {
        return left.campaign.name.localeCompare(right.campaign.name, "bg");
      }
      if (sortKey === "name-desc") {
        return right.campaign.name.localeCompare(left.campaign.name, "bg");
      }
      const leftTime = new Date(left.campaign.starts_at).getTime();
      const rightTime = new Date(right.campaign.starts_at).getTime();
      return sortKey === "starts-asc" ? leftTime - rightTime : rightTime - leftTime;
    });
  }, [enriched, query, sortKey, statusFilter]);

  return (
    <section>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h3 className="font-heading text-lg text-boutique-ink">Кампании</h3>
        <p className="text-xs text-boutique-muted">{campaigns.length} общо</p>
      </div>

      <div className="mt-4 grid gap-2 rounded-xl border border-boutique-line bg-boutique-bg/70 p-3 lg:grid-cols-[minmax(0,1.2fr)_10rem_12rem_auto]">
        <label className="text-xs font-semibold uppercase tracking-wider text-boutique-muted">
          Търсене
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Име на кампания..."
            className="mt-1.5 w-full rounded-lg border border-boutique-line bg-white px-3 py-2 text-sm font-normal normal-case tracking-normal text-boutique-ink"
          />
        </label>
        <label className="text-xs font-semibold uppercase tracking-wider text-boutique-muted">
          Статус
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
            className="mt-1.5 w-full rounded-lg border border-boutique-line bg-white px-3 py-2 text-sm font-normal normal-case tracking-normal text-boutique-ink"
          >
            <option value="all">Всички</option>
            <option value="active">Активни</option>
            <option value="planned">Планирани</option>
            <option value="ended">Приключили</option>
            <option value="inactive">Неактивни</option>
          </select>
        </label>
        <label className="text-xs font-semibold uppercase tracking-wider text-boutique-muted">
          Сортиране
          <select
            value={sortKey}
            onChange={(event) => setSortKey(event.target.value as SortKey)}
            className="mt-1.5 w-full rounded-lg border border-boutique-line bg-white px-3 py-2 text-sm font-normal normal-case tracking-normal text-boutique-ink"
          >
            <option value="starts-desc">Период ↓</option>
            <option value="starts-asc">Период ↑</option>
            <option value="name-asc">Име А–Я</option>
            <option value="name-desc">Име Я–А</option>
          </select>
        </label>
        <button
          type="button"
          onClick={() => {
            setQuery("");
            setStatusFilter("all");
            setSortKey("starts-desc");
          }}
          className="self-end rounded-full border border-boutique-line bg-white px-4 py-2 text-xs font-semibold text-boutique-ink"
        >
          Изчисти
        </button>
      </div>

      {visibleCampaigns.length === 0 ? (
        <p className="mt-4 text-sm text-boutique-muted">Няма кампании по избраните критерии.</p>
      ) : (
        <div className="mt-4 overflow-hidden rounded-xl border border-boutique-line">
          <div
            className={`${adminTableHeadClass} hidden px-3 py-2 md:grid md:grid-cols-[minmax(0,1.4fr)_6rem_5rem_minmax(0,1fr)_4rem_auto] md:gap-2`}
            aria-hidden
          >
            <span>Кампания</span>
            <span>Статус</span>
            <span>Отстъпка</span>
            <span>Период</span>
            <span>Пр.</span>
            <span className="text-right">Действия</span>
          </div>

          {visibleCampaigns.map(({ campaign, campaignPromotions, status, productCount }) => {
            const detailsId = `campaign-${campaign.id}`;
            const statusLabel = formatPromotionLifecycleStatus(campaign);
            const rowHighlight =
              status === "active"
                ? "border-l-4 border-l-emerald-400"
                : status === "planned"
                  ? "border-l-4 border-l-sky-400"
                  : "";

            return (
              <div
                key={campaign.id}
                className={`border-b border-boutique-line/70 bg-white last:border-b-0 ${rowHighlight}`}
              >
                <div className="hidden px-3 py-2 md:grid md:grid-cols-[minmax(0,1.4fr)_6rem_5rem_minmax(0,1fr)_4rem_auto] md:items-center md:gap-2">
                  <p className="truncate font-medium text-boutique-ink">{campaign.name}</p>
                  <span
                    className={`inline-flex w-fit rounded-full px-2 py-0.5 text-[10px] font-semibold ${STATUS_BADGE[status] ?? STATUS_BADGE.inactive}`}
                  >
                    {statusLabel}
                  </span>
                  <p className="text-sm text-boutique-accent">
                    -{Number(campaign.discount_percentage)}%
                  </p>
                  <p className="text-xs text-boutique-muted">
                    {new Date(campaign.starts_at).toLocaleDateString("bg-BG")} –{" "}
                    {new Date(campaign.ends_at).toLocaleDateString("bg-BG")}
                  </p>
                  <p className="text-xs text-boutique-muted">{productCount}</p>
                  <CampaignActions campaign={campaign} detailsId={detailsId} isActive={campaign.is_active} />
                </div>

                <div className="flex items-center justify-between gap-2 px-2 py-2 md:hidden">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-boutique-ink">{campaign.name}</p>
                    <p className="text-xs text-boutique-muted">
                      {statusLabel} · {productCount} пр. · -{Number(campaign.discount_percentage)}%
                    </p>
                  </div>
                  <CampaignActions campaign={campaign} detailsId={detailsId} isActive={campaign.is_active} compact />
                </div>

                <details id={detailsId} className="border-t border-boutique-line/60 bg-boutique-bg/35 px-3 py-2">
                  <summary className="cursor-pointer text-xs font-semibold text-boutique-sage-deep">
                    Преглед и редакция
                  </summary>

                  <div className="mt-3 grid gap-4 lg:grid-cols-2">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-boutique-muted">
                        Включени продукти ({productCount})
                      </p>
                      <ul className="mt-2 max-h-48 space-y-1 overflow-y-auto text-sm">
                        {campaignPromotions.map((promotion) => {
                          const productName =
                            productNamesById.get(promotion.product_id) ?? "Неизвестен продукт";
                          const basePrice = productPricesById.get(promotion.product_id) ?? 0;
                          const effective =
                            Math.round(
                              basePrice * (1 - Number(campaign.discount_percentage) / 100) * 100,
                            ) / 100;

                          return (
                            <li
                              key={promotion.id}
                              className="flex flex-wrap items-baseline justify-between gap-2 rounded-lg border border-boutique-line/70 bg-white px-2 py-1.5"
                            >
                              <span className="text-boutique-ink">{productName}</span>
                              <span className="text-xs text-boutique-muted">
                                <span className="line-through">{formatEur(basePrice)}</span>{" "}
                                <span className="font-medium text-boutique-accent">
                                  {formatEur(effective)}
                                </span>
                              </span>
                            </li>
                          );
                        })}
                      </ul>
                    </div>

                    <form action={updatePromotionCampaign} className="grid gap-3">
                      <input
                        type="hidden"
                        name={adminFormFields.promotion.campaignId}
                        value={campaign.id}
                      />
                      <label className="text-xs font-medium text-boutique-ink">
                        Име
                        <input
                          name={adminFormFields.promotion.name}
                          defaultValue={campaign.name}
                          required
                          className={adminFieldClass}
                        />
                      </label>
                      <label className="text-xs font-medium text-boutique-ink">
                        Отстъпка (%)
                        <input
                          name={adminFormFields.promotion.discountValue}
                          type="number"
                          min="0.01"
                          max="100"
                          step="0.01"
                          defaultValue={Number(campaign.discount_percentage)}
                          required
                          className={adminFieldClass}
                        />
                      </label>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <label className="text-xs font-medium text-boutique-ink">
                          Начало
                          <input
                            name={adminFormFields.promotion.startsAt}
                            type="datetime-local"
                            defaultValue={toDateTimeLocal(campaign.starts_at)}
                            required
                            className={adminFieldClass}
                          />
                        </label>
                        <label className="text-xs font-medium text-boutique-ink">
                          Край
                          <input
                            name={adminFormFields.promotion.endsAt}
                            type="datetime-local"
                            defaultValue={toDateTimeLocal(campaign.ends_at)}
                            required
                            className={adminFieldClass}
                          />
                        </label>
                      </div>
                      <label className="inline-flex items-center gap-2 text-xs font-medium text-boutique-ink">
                        <input
                          name={adminFormFields.promotion.isActive}
                          type="checkbox"
                          defaultChecked={campaign.is_active}
                          className="h-4 w-4 rounded border-boutique-line"
                        />
                        Активна кампания
                      </label>
                      <p className="text-[11px] text-boutique-muted">
                        Продуктовият списък не се променя от тук. За нов подбор създайте копие на
                        кампанията.
                      </p>
                      <button className="justify-self-start rounded-full bg-boutique-ink px-4 py-2 text-xs font-semibold uppercase tracking-wider text-white">
                        Запази кампанията
                      </button>
                    </form>
                  </div>
                </details>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

function CampaignActions({
  campaign,
  detailsId,
  isActive,
  compact = false,
}: {
  campaign: PromotionCampaignRow;
  detailsId: string;
  isActive: boolean;
  compact?: boolean;
}) {
  return (
    <div className={`flex flex-wrap justify-end gap-1 ${compact ? "" : ""}`}>
      <AdminOpenDetailsButton
        detailsId={detailsId}
        className="rounded-full border border-boutique-line px-2.5 py-1 text-[11px] font-semibold text-boutique-ink"
      >
        {compact ? "Преглед" : "Преглед"}
      </AdminOpenDetailsButton>
      <form action={duplicatePromotionCampaign} className="inline">
        <input type="hidden" name={adminFormFields.promotion.campaignId} value={campaign.id} />
        <button className="rounded-full border border-boutique-line px-2.5 py-1 text-[11px] font-semibold text-boutique-ink">
          Дублирай
        </button>
      </form>
      <form action={setPromotionCampaignActive} className="inline">
        <input type="hidden" name={adminFormFields.promotion.campaignId} value={campaign.id} />
        <input
          type="hidden"
          name={adminFormFields.promotion.isActive}
          value={isActive ? "false" : "true"}
        />
        <button className="rounded-full border border-boutique-line px-2.5 py-1 text-[11px] font-semibold text-boutique-ink">
          {isActive ? "Спри" : "Активирай"}
        </button>
      </form>
      <AdminConfirmForm
        action={deletePromotionCampaign}
        confirmMessage={`Сигурни ли сте, че искате да изтриете кампанията „${campaign.name}"?`}
        className="inline"
      >
        <input type="hidden" name={adminFormFields.promotion.campaignId} value={campaign.id} />
        <button className="rounded-full border border-red-200 px-2.5 py-1 text-[11px] font-semibold text-red-700">
          Изтрий
        </button>
      </AdminConfirmForm>
    </div>
  );
}
