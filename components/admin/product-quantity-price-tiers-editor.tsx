"use client";

import { useMemo, useState } from "react";

import { adminFormFields } from "@/lib/admin/form-fields";
import type { ProductQuantityPriceTier } from "@/lib/product-quantity-pricing";
import { normalizeQuantityPriceTiers } from "@/lib/product-quantity-pricing";

type DraftTier = {
  id: string;
  minQuantity: string;
  maxQuantity: string;
  unitPrice: string;
};

type ProductQuantityPriceTiersEditorProps = {
  initialTiers?: ProductQuantityPriceTier[];
  fieldClassName: string;
  helperClassName: string;
};

function toDraftTier(
  tier: ProductQuantityPriceTier,
  index: number,
): DraftTier {
  return {
    id: `tier-${index}-${tier.minQuantity}`,
    minQuantity: String(tier.minQuantity),
    maxQuantity: tier.maxQuantity === null ? "" : String(tier.maxQuantity),
    unitPrice: tier.unitPrice.toFixed(2),
  };
}

export function ProductQuantityPriceTiersEditor({
  initialTiers = [],
  fieldClassName,
  helperClassName,
}: ProductQuantityPriceTiersEditorProps) {
  const [tiers, setTiers] = useState<DraftTier[]>(() =>
    normalizeQuantityPriceTiers(initialTiers).map(toDraftTier),
  );

  const serializedTiers = useMemo(
    () =>
      JSON.stringify(
        normalizeQuantityPriceTiers(
          tiers.map((tier) => ({
            minQuantity: tier.minQuantity,
            maxQuantity: tier.maxQuantity,
            unitPrice: tier.unitPrice,
          })),
        ),
      ),
    [tiers],
  );

  function updateTier(id: string, patch: Partial<DraftTier>) {
    setTiers((current) =>
      current.map((tier) => (tier.id === id ? { ...tier, ...patch } : tier)),
    );
  }

  return (
    <fieldset className="space-y-3 rounded-lg border border-boutique-line/70 bg-boutique-bg p-3">
      <legend className="px-1 text-sm font-medium text-boutique-ink">
        Цени според количество
      </legend>
      <input
        type="hidden"
        name={adminFormFields.product.quantityPriceTiers}
        value={serializedTiers}
      />

      <p className={helperClassName}>
        По желание въведете единична цена за диапазони от бройки. Ако няма редове,
        се използва основната цена.
      </p>

      {tiers.length ? (
        <div className="space-y-2">
          {tiers.map((tier) => (
            <div
              key={tier.id}
              className="grid gap-2 rounded-lg border border-boutique-line/70 bg-white p-3 md:grid-cols-[1fr_1fr_1fr_auto]"
            >
              <label className="text-xs font-semibold uppercase tracking-wider text-boutique-muted">
                От брой
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={tier.minQuantity}
                  onChange={(event) =>
                    updateTier(tier.id, { minQuantity: event.target.value })
                  }
                  className={`${fieldClassName} !mt-1`}
                />
              </label>
              <label className="text-xs font-semibold uppercase tracking-wider text-boutique-muted">
                До брой
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={tier.maxQuantity}
                  placeholder="без край"
                  onChange={(event) =>
                    updateTier(tier.id, { maxQuantity: event.target.value })
                  }
                  className={`${fieldClassName} !mt-1`}
                />
              </label>
              <label className="text-xs font-semibold uppercase tracking-wider text-boutique-muted">
                Цена за 1 бр.
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={tier.unitPrice}
                  onChange={(event) =>
                    updateTier(tier.id, { unitPrice: event.target.value })
                  }
                  className={`${fieldClassName} !mt-1`}
                />
              </label>
              <button
                type="button"
                onClick={() =>
                  setTiers((current) => current.filter((item) => item.id !== tier.id))
                }
                className="self-end rounded-full border border-boutique-line px-4 py-2 text-xs font-semibold text-boutique-ink hover:border-boutique-accent/40"
              >
                Премахни
              </button>
            </div>
          ))}
        </div>
      ) : null}

      <button
        type="button"
        onClick={() =>
          setTiers((current) => [
            ...current,
            {
              id: `tier-${Date.now()}-${current.length}`,
              minQuantity: current.length ? "" : "1",
              maxQuantity: "",
              unitPrice: "",
            },
          ])
        }
        className="rounded-full border border-boutique-sage-deep/30 px-4 py-2 text-xs font-semibold text-boutique-sage-deep hover:border-boutique-sage-deep"
      >
        Добави ценови диапазон
      </button>
    </fieldset>
  );
}
