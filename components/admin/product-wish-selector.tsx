import { adminFormFields } from "@/lib/admin/form-fields";
import type { WishTemplateRow } from "@/lib/admin/types";

type Props = {
  wishes: WishTemplateRow[];
  selectedIds?: string[];
  helperClassName: string;
};

export function ProductWishSelector({
  wishes,
  selectedIds = [],
  helperClassName,
}: Props) {
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
    <div className="grid gap-2">
      {wishes.map((wish) => (
        <label
          key={wish.id}
          className="flex cursor-pointer items-start gap-3 rounded-lg border border-boutique-line bg-white p-3 text-sm text-boutique-ink"
        >
          <input
            type="checkbox"
            name={adminFormFields.product.wishTemplateIds}
            value={wish.id}
            defaultChecked={selectedIds.includes(wish.id)}
            className="mt-1 h-4 w-4 rounded border-boutique-line text-boutique-accent"
          />
          <span className="line-clamp-3 whitespace-pre-line leading-5">
            {wish.body}
          </span>
        </label>
      ))}
      <p className={helperClassName}>
        Клиентът ще вижда само избраните тук текстове, когато полето позволява
        готови пожелания.
      </p>
    </div>
  );
}
