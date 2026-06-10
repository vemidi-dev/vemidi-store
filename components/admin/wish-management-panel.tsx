import {
  createWishTemplate,
  deleteWishTemplate,
} from "@/app/admin/wish-actions";
import { adminFieldClass, adminPanelClass } from "@/components/admin/styles";
import type {
  CategoryRow,
  WishTemplateOccasionRow,
  WishTemplateRow,
} from "@/lib/admin/types";

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

export function WishManagementPanel({
  occasions,
  wishes,
  links,
}: {
  occasions: CategoryRow[];
  wishes: WishTemplateRow[];
  links: WishTemplateOccasionRow[];
}) {
  const occasionById = new Map(occasions.map((item) => [item.id, item.name]));

  return (
    <article className={`${adminPanelClass} !p-5 md:!p-6`}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 className="font-heading text-xl text-boutique-ink">
          Готови пожелания
        </h2>
        {wishes.length > 0 ? (
          <span className="text-xs text-boutique-muted">
            {wishes.length} {wishes.length === 1 ? "пожелание" : "пожелания"}
          </span>
        ) : null}
      </div>
      <p className="mt-1 text-xs leading-relaxed text-boutique-muted">
        Един текст може да бъде свързан с повече от един повод.
      </p>

      <form
        action={createWishTemplate}
        className="mt-4 grid gap-3 rounded-lg border border-boutique-line bg-boutique-bg p-4"
      >
        <label className="text-xs font-medium text-boutique-ink">
          Нов текст
          <textarea
            name="body"
            required
            rows={3}
            placeholder="Текст на пожеланието"
            className={`${adminFieldClass} !mt-1 resize-y`}
          />
        </label>

        <fieldset>
          <legend className="text-xs font-semibold text-boutique-ink">
            Подходящо за
          </legend>
          <div className="mt-2 rounded-lg border border-boutique-line/70 bg-boutique-paper p-2">
            <div className="grid gap-1.5 sm:grid-cols-3 lg:grid-cols-4">
              {occasions.map((occasion) => (
                <label
                  key={occasion.id}
                  className="flex cursor-pointer items-center gap-1.5 rounded-md border border-transparent px-2 py-1 text-xs text-boutique-ink transition hover:border-boutique-line hover:bg-white has-[:checked]:border-boutique-sage-deep/40 has-[:checked]:bg-boutique-sage-deep/5"
                >
                  <input
                    type="checkbox"
                    name="category_ids"
                    value={occasion.id}
                    className="h-3.5 w-3.5 shrink-0 rounded border-boutique-line text-boutique-sage-deep"
                  />
                  <span className="leading-tight">{occasion.name}</span>
                </label>
              ))}
            </div>
          </div>
        </fieldset>

        <div className="flex justify-end border-t border-boutique-line/60 pt-3">
          <button className="rounded-full bg-boutique-ink px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white transition hover:bg-boutique-accent">
            Добави пожелание
          </button>
        </div>
      </form>

      <div className="mt-5 grid gap-1.5">
        {wishes.map((wish) => {
          const wishOccasions = links
            .filter((link) => link.wish_template_id === wish.id)
            .map((link) => occasionById.get(link.category_id))
            .filter(Boolean);

          return (
            <article
              key={wish.id}
              className="group flex gap-2 rounded-lg border border-boutique-line bg-white px-2.5 py-2 transition hover:border-boutique-sage-deep/30 hover:shadow-boutique-sm"
            >
              <div className="min-w-0 flex-1">
                <p className="whitespace-pre-line text-xs leading-snug text-boutique-ink">
                  {wish.body}
                </p>
                {wishOccasions.length > 0 ? (
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {wishOccasions.map((name) => (
                      <span
                        key={name}
                        className="rounded-full bg-boutique-sage-deep/10 px-1.5 py-px text-[9px] font-medium leading-tight text-boutique-sage-deep"
                      >
                        {name}
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>
              <form action={deleteWishTemplate} className="shrink-0">
                <input type="hidden" name="id" value={wish.id} />
                <button
                  type="submit"
                  aria-label="Изтрий"
                  title="Изтрий"
                  className="rounded-md p-1 text-red-600 opacity-60 transition hover:bg-red-50 hover:opacity-100"
                >
                  <IconTrash className="h-3.5 w-3.5" />
                </button>
              </form>
            </article>
          );
        })}
      </div>
    </article>
  );
}
