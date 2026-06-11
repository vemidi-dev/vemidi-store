"use client";

import { useMemo, useState } from "react";

import { adminFormFields } from "@/lib/admin/form-fields";
import type {
  CategoryRow,
  WishTemplateOccasionRow,
  WishTemplateRow,
} from "@/lib/admin/types";

type WishFilter = "all" | "unassigned" | string;

type Props = {
  wishes: WishTemplateRow[];
  occasions: CategoryRow[];
  wishOccasionLinks: WishTemplateOccasionRow[];
  selectedIds?: string[];
  helperClassName: string;
};

function filterButtonClass(isActive: boolean) {
  return [
    "rounded-full border px-3 py-1.5 text-xs font-medium transition",
    isActive
      ? "border-boutique-sage-deep bg-boutique-sage-deep/10 text-boutique-sage-deep"
      : "border-boutique-line bg-white text-boutique-ink hover:border-boutique-sage-deep/40 hover:bg-boutique-sage-deep/5",
  ].join(" ");
}

export function ProductWishSelector({
  wishes,
  occasions,
  wishOccasionLinks,
  selectedIds = [],
  helperClassName,
}: Props) {
  const [activeFilter, setActiveFilter] = useState<WishFilter>("all");

  const occasionIdsByWishId = useMemo(() => {
    const map = new Map<string, Set<string>>();
    wishOccasionLinks.forEach((link) => {
      const ids = map.get(link.wish_template_id) ?? new Set<string>();
      ids.add(link.category_id);
      map.set(link.wish_template_id, ids);
    });
    return map;
  }, [wishOccasionLinks]);

  const unassignedCount = useMemo(
    () => wishes.filter((wish) => !occasionIdsByWishId.has(wish.id)).length,
    [wishes, occasionIdsByWishId],
  );

  const visibleWishIds = useMemo(() => {
    if (activeFilter === "all") {
      return new Set(wishes.map((wish) => wish.id));
    }

    if (activeFilter === "unassigned") {
      return new Set(
        wishes
          .filter((wish) => !occasionIdsByWishId.has(wish.id))
          .map((wish) => wish.id),
      );
    }

    return new Set(
      wishes
        .filter((wish) => occasionIdsByWishId.get(wish.id)?.has(activeFilter))
        .map((wish) => wish.id),
    );
  }, [activeFilter, wishes, occasionIdsByWishId]);

  const visibleCount = visibleWishIds.size;

  if (wishes.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-boutique-line p-4">
        <p className={helperClassName}>
          Няма добавени готови пожелания. Създайте ги първо в таб „Пожелания“.
        </p>
        <a
          href="/admin?tab=wishes"
          className="mt-3 inline-flex rounded-full border border-boutique-line px-4 py-2 text-xs font-semibold text-boutique-ink"
        >
          Към пожеланията
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {occasions.length > 0 ? (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-boutique-ink">Филтър по повод</p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setActiveFilter("all")}
              className={filterButtonClass(activeFilter === "all")}
            >
              Всички ({wishes.length})
            </button>
            {occasions.map((occasion) => {
              const count = wishes.filter((wish) =>
                occasionIdsByWishId.get(wish.id)?.has(occasion.id),
              ).length;
              if (count === 0) {
                return null;
              }

              return (
                <button
                  key={occasion.id}
                  type="button"
                  onClick={() => setActiveFilter(occasion.id)}
                  className={filterButtonClass(activeFilter === occasion.id)}
                >
                  {occasion.name} ({count})
                </button>
              );
            })}
            {unassignedCount > 0 ? (
              <button
                type="button"
                onClick={() => setActiveFilter("unassigned")}
                className={filterButtonClass(activeFilter === "unassigned")}
              >
                Без повод ({unassignedCount})
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      <div className="grid gap-2">
        {wishes.map((wish) => {
          const isVisible = visibleWishIds.has(wish.id);
          const wishOccasionNames = [...(occasionIdsByWishId.get(wish.id) ?? [])]
            .map((id) => occasions.find((occasion) => occasion.id === id)?.name)
            .filter(Boolean) as string[];

          return (
            <label
              key={wish.id}
              className={[
                "flex cursor-pointer items-start gap-3 rounded-lg border border-boutique-line bg-white p-3 text-sm text-boutique-ink",
                isVisible ? "" : "hidden",
              ].join(" ")}
            >
              <input
                type="checkbox"
                name={adminFormFields.product.wishTemplateIds}
                value={wish.id}
                defaultChecked={selectedIds.includes(wish.id)}
                className="mt-1 h-4 w-4 shrink-0 rounded border-boutique-line text-boutique-accent"
              />
              <span className="min-w-0">
                <span className="line-clamp-3 whitespace-pre-line leading-5">
                  {wish.body}
                </span>
                {wishOccasionNames.length > 0 ? (
                  <span className="mt-1.5 flex flex-wrap gap-1">
                    {wishOccasionNames.map((name) => (
                      <span
                        key={name}
                        className="rounded-full bg-boutique-sage-deep/10 px-1.5 py-px text-[10px] font-medium text-boutique-sage-deep"
                      >
                        {name}
                      </span>
                    ))}
                  </span>
                ) : null}
              </span>
            </label>
          );
        })}
      </div>

      {visibleCount === 0 ? (
        <p className="rounded-lg border border-dashed border-boutique-line px-4 py-3 text-sm text-boutique-muted">
          Няма пожелания за избрания повод.
        </p>
      ) : null}

      <p className={helperClassName}>
        Клиентът ще вижда само избраните тук текстове, когато полето позволява готови
        пожелания.
      </p>
    </div>
  );
}
