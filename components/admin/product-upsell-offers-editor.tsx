"use client";

import Image from "next/image";
import { useMemo, useState } from "react";

import { adminFormFields } from "@/lib/admin/form-fields";
import type { ProductRow } from "@/lib/admin/types";
import type { ProductUpsellOfferRow } from "@/lib/storefront/product-upsells";

type ProductUpsellOffersEditorProps = {
  sourceProductId: string;
  products: ProductRow[];
  offers: ProductUpsellOfferRow[];
  sectionTitle: string;
  fieldClassName: string;
  helperClassName: string;
};

type VisibilityFilter = "all" | "upsell_only" | "public" | "selected";

function productSearchText(product: ProductRow) {
  return [
    product.name,
    product.slug,
    product.product_code,
    product.visibility === "upsell_only" ? "само добавка upsell" : "магазин публичен",
  ]
    .filter(Boolean)
    .join(" ")
    .toLocaleLowerCase("bg");
}

function visibilityLabel(product: ProductRow) {
  return product.visibility === "upsell_only" ? "Само като добавка" : "В магазина";
}

export function ProductUpsellOffersEditor({
  sourceProductId,
  products,
  offers,
  sectionTitle,
  fieldClassName,
  helperClassName,
}: ProductUpsellOffersEditorProps) {
  const [query, setQuery] = useState("");
  const [visibilityFilter, setVisibilityFilter] =
    useState<VisibilityFilter>("all");
  const offersByTargetId = useMemo(
    () => new Map(offers.map((offer) => [offer.upsell_product_id, offer])),
    [offers],
  );
  const normalizedQuery = query.trim().toLocaleLowerCase("bg");
  const allCandidates = useMemo(
    () =>
      products
        .filter((product) => product.id !== sourceProductId)
        .sort((left, right) => {
          const leftSelected = offersByTargetId.has(left.id) ? 0 : 1;
          const rightSelected = offersByTargetId.has(right.id) ? 0 : 1;
          if (leftSelected !== rightSelected) {
            return leftSelected - rightSelected;
          }
          const leftUpsellOnly = left.visibility === "upsell_only" ? 0 : 1;
          const rightUpsellOnly = right.visibility === "upsell_only" ? 0 : 1;
          if (leftUpsellOnly !== rightUpsellOnly) {
            return leftUpsellOnly - rightUpsellOnly;
          }
          return left.name.localeCompare(right.name, "bg");
        }),
    [offersByTargetId, products, sourceProductId],
  );
  const matchingCandidateIds = useMemo(
    () =>
      new Set(
        allCandidates
          .filter((product) => {
            const isSelected = offersByTargetId.has(product.id);
            if (visibilityFilter === "selected") {
              return isSelected;
            }
            if (visibilityFilter !== "all" && product.visibility !== visibilityFilter) {
              return false;
            }
            if (!normalizedQuery) {
              return true;
            }
            return productSearchText(product).includes(normalizedQuery);
          })
          .map((product) => product.id),
      ),
    [allCandidates, normalizedQuery, offersByTargetId, visibilityFilter],
  );

  if (products.filter((product) => product.id !== sourceProductId).length === 0) {
    return (
      <p className={helperClassName}>
        Няма други продукти, които могат да бъдат избрани като upsell.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <p className={helperClassName}>
        Изберете продукти, които да се предлагат като добавка. Търсенето работи
        по име, код и slug. Специалната цена важи само през upsell flow.
      </p>

      <label className="block text-xs font-medium text-boutique-ink">
        Заглавие на upsell секцията
        <input
          name={adminFormFields.product.upsellSectionTitle}
          defaultValue={sectionTitle}
          className={fieldClassName}
          maxLength={120}
          placeholder="Добавете към подаръка"
        />
        <span className="mt-1 block text-[11px] font-normal text-boutique-muted">
          Ако е празно, в магазина ще се използва „Добавете към подаръка“.
        </span>
      </label>

      <div className="grid gap-3 rounded-lg border border-boutique-line/70 bg-white p-3 lg:grid-cols-[minmax(0,1fr)_16rem]">
        <label className="text-xs font-medium text-boutique-ink">
          Търсене
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className={fieldClassName}
            placeholder="Име, код или slug..."
          />
        </label>
        <label className="text-xs font-medium text-boutique-ink">
          Филтър
          <select
            value={visibilityFilter}
            onChange={(event) =>
              setVisibilityFilter(event.target.value as VisibilityFilter)
            }
            className={fieldClassName}
          >
            <option value="all">Всички подходящи</option>
            <option value="upsell_only">Само като добавка</option>
            <option value="public">Публични</option>
            <option value="selected">Вече избрани</option>
          </select>
        </label>
      </div>

      <p className="text-xs text-boutique-muted">
        Показани: {matchingCandidateIds.size} продукта
      </p>

      <div className="grid gap-3">
        {allCandidates.map((product) => {
          const offer = offersByTargetId.get(product.id);
          const isSelected = Boolean(offer);
          const isVisible = matchingCandidateIds.has(product.id);

          return (
            <section
              key={product.id}
              hidden={!isVisible}
              className="rounded-lg border border-boutique-line/70 bg-white p-3"
            >
              <input
                type="hidden"
                name={adminFormFields.product.upsellTargetIds}
                value={product.id}
              />
              <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(22rem,36rem)] lg:items-start">
                <label className="grid cursor-pointer grid-cols-[4.5rem_minmax(0,1fr)] gap-3 text-sm font-medium text-boutique-ink">
                  <span className="relative aspect-square overflow-hidden rounded-lg border border-boutique-line bg-boutique-bg">
                    {product.image_url ? (
                      <Image
                        src={product.image_url}
                        alt={product.name}
                        fill
                        sizes="72px"
                        className="object-cover"
                      />
                    ) : (
                      <span className="grid h-full w-full place-items-center text-lg text-boutique-muted">
                        ◇
                      </span>
                    )}
                  </span>
                  <span className="min-w-0">
                    <span className="flex items-start gap-2">
                      <input
                        type="checkbox"
                        name={adminFormFields.product.upsellEnabledIds}
                        value={product.id}
                        defaultChecked={isSelected}
                        className="mt-1 h-4 w-4 shrink-0 rounded border-boutique-line text-boutique-accent"
                      />
                      <span className="min-w-0">
                        <span className="block truncate">{product.name}</span>
                        <span className="mt-0.5 block text-xs font-normal text-boutique-muted">
                          {visibilityLabel(product)} · {Number(product.price).toFixed(2)} € ·{" "}
                          {product.product_code}
                        </span>
                        <span className="mt-0.5 block truncate text-[11px] font-normal text-boutique-muted">
                          /produkti/{product.slug}
                        </span>
                      </span>
                    </span>
                  </span>
                </label>

                <div className="grid gap-2 sm:grid-cols-2">
                  <label className="text-xs font-medium text-boutique-ink sm:col-span-2">
                    Текст на офертата
                    <input
                      name={adminFormFields.product.upsellTitles}
                      defaultValue={offer?.offer_title ?? ""}
                      className={fieldClassName}
                      placeholder="Напр. Добавете папийонка с име"
                    />
                  </label>
                  <label className="text-xs font-medium text-boutique-ink sm:col-span-2">
                    Описание
                    <textarea
                      name={adminFormFields.product.upsellDescriptions}
                      rows={2}
                      defaultValue={offer?.offer_description ?? ""}
                      className={`${fieldClassName} resize-y`}
                      placeholder="Кратък текст за специалната оферта"
                    />
                  </label>
                  <label className="text-xs font-medium text-boutique-ink">
                    Специална цена
                    <input
                      name={adminFormFields.product.upsellSpecialPrices}
                      type="number"
                      min="0"
                      step="0.01"
                      defaultValue={offer ? Number(offer.special_price) : ""}
                      className={fieldClassName}
                    />
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <label className="text-xs font-medium text-boutique-ink">
                      Предложени
                      <input
                        name={adminFormFields.product.upsellSuggestedQuantities}
                        type="number"
                        min="1"
                        step="1"
                        defaultValue={offer?.suggested_quantity ?? 1}
                        className={fieldClassName}
                      />
                    </label>
                    <label className="text-xs font-medium text-boutique-ink">
                      Макс.
                      <input
                        name={adminFormFields.product.upsellMaxQuantities}
                        type="number"
                        min="1"
                        step="1"
                        defaultValue={offer?.max_quantity ?? 1}
                        className={fieldClassName}
                      />
                    </label>
                  </div>
                </div>
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
