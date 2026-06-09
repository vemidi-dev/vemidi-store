import {
  createPersonalizationField,
  createWishTemplate,
  deletePersonalizationField,
  deleteWishTemplate,
} from "@/app/admin/wish-actions";
import { adminFieldClass, adminPanelClass } from "@/components/admin/styles";
import type {
  CategoryRow,
  ProductPersonalizationFieldRow,
  ProductRow,
  WishTemplateOccasionRow,
  WishTemplateRow,
} from "@/lib/admin/types";

export function WishManagementPanel({
  products,
  occasions,
  wishes,
  links,
  fields,
}: {
  products: ProductRow[];
  occasions: CategoryRow[];
  wishes: WishTemplateRow[];
  links: WishTemplateOccasionRow[];
  fields: ProductPersonalizationFieldRow[];
}) {
  const occasionById = new Map(occasions.map((item) => [item.id, item.name]));
  const productById = new Map(products.map((item) => [item.id, item.name]));
  return (
    <div className="space-y-8">
      <article className={adminPanelClass}>
        <h2 className="font-heading text-2xl text-boutique-ink">Готови пожелания</h2>
        <p className="mt-2 text-sm text-boutique-muted">Един текст може да бъде свързан с повече от един повод.</p>
        <form action={createWishTemplate} className="mt-6 grid gap-4">
          <input name="title" required placeholder="Кратко заглавие" className={adminFieldClass} />
          <textarea name="body" required rows={5} placeholder="Текст на пожеланието" className={adminFieldClass} />
          <fieldset className="grid gap-2 sm:grid-cols-3">
            <legend className="mb-2 text-sm font-semibold">Подходящо за:</legend>
            {occasions.map((occasion) => (
              <label key={occasion.id} className="flex gap-2 text-sm">
                <input type="checkbox" name="category_ids" value={occasion.id} />
                {occasion.name}
              </label>
            ))}
          </fieldset>
          <button className="w-fit rounded-full bg-boutique-ink px-5 py-3 text-xs font-semibold uppercase text-white">Добави пожелание</button>
        </form>
        <div className="mt-8 grid gap-3">
          {wishes.map((wish) => (
            <article key={wish.id} className="rounded-xl border border-boutique-line bg-boutique-bg p-4">
              <h3 className="font-semibold">{wish.title}</h3>
              <p className="mt-2 whitespace-pre-line text-sm text-boutique-muted">{wish.body}</p>
              <p className="mt-2 text-xs text-boutique-sage-deep">
                {links.filter((link) => link.wish_template_id === wish.id).map((link) => occasionById.get(link.category_id)).filter(Boolean).join(", ")}
              </p>
              <form action={deleteWishTemplate} className="mt-3">
                <input type="hidden" name="id" value={wish.id} />
                <button className="text-xs font-semibold text-red-700">Изтрий</button>
              </form>
            </article>
          ))}
        </div>
      </article>

      <article className={adminPanelClass}>
        <h2 className="font-heading text-2xl text-boutique-ink">Полета за персонализация</h2>
        <form action={createPersonalizationField} className="mt-6 grid gap-4 md:grid-cols-2">
          <select name="product_id" required className={adminFieldClass}>
            <option value="">Изберете продукт</option>
            {products.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}
          </select>
          <input name="label" required placeholder="Име на полето, напр. Име" className={adminFieldClass} />
          <input name="field_key" required placeholder="Ключ, напр. name" className={adminFieldClass} />
          <select name="field_type" defaultValue="text" className={adminFieldClass}>
            <option value="text">Кратък текст</option>
            <option value="textarea">Дълъг текст</option>
            <option value="date">Дата</option>
          </select>
          <input name="placeholder" placeholder="Подсказка в полето" className={adminFieldClass} />
          <input name="max_length" type="number" min="1" max="1000" defaultValue="100" className={adminFieldClass} />
          <label className="flex items-center gap-2 text-sm"><input name="is_required" type="checkbox" /> Задължително поле</label>
          <label className="flex items-center gap-2 text-sm"><input name="allows_wish_templates" type="checkbox" /> Показва готови пожелания</label>
          <button className="w-fit rounded-full bg-boutique-ink px-5 py-3 text-xs font-semibold uppercase text-white">Добави поле</button>
        </form>
        <div className="mt-8 space-y-3">
          {fields.map((field) => (
            <div key={field.id} className="flex flex-wrap justify-between gap-3 rounded-xl border border-boutique-line p-4">
              <p className="text-sm"><strong>{productById.get(field.product_id)}</strong> · {field.label} · {field.field_type}{field.allows_wish_templates ? " · пожелания" : ""}</p>
              <form action={deletePersonalizationField}>
                <input type="hidden" name="id" value={field.id} />
                <button className="text-xs font-semibold text-red-700">Изтрий</button>
              </form>
            </div>
          ))}
        </div>
      </article>
    </div>
  );
}
