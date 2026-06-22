import { createEvent } from "@/app/admin/content-actions";
import { AdminSectionAccordion } from "@/components/admin/admin-section-accordion";
import { EventListView } from "@/components/admin/event-list-view";
import { ImageFileInput } from "@/components/admin/image-file-input";
import { adminFieldClass, adminHelperClass, adminPanelClass } from "@/components/admin/styles";
import type { EventRow } from "@/lib/admin/types";

export function EventManagementPanel({
  items,
  error,
}: {
  items: EventRow[];
  error: { message: string } | null;
}) {
  return (
    <div className="space-y-6">
      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
          Данните не могат да се заредят: {error.message}. Изпълнете SQL миграцията за блог и събития.
        </div>
      ) : null}

      <AdminSectionAccordion
        title="Добавяне на събитие"
        countLabel="свиване / разгъване"
      >
        <form action={createEvent} className="grid gap-5 md:grid-cols-2">
          <input type="hidden" name="tab" value="events" />
          <label className="text-sm font-medium text-boutique-ink">
            Заглавие
            <input name="title" required maxLength={160} className={adminFieldClass} />
          </label>
          <label className="text-sm font-medium text-boutique-ink">
            Slug
            <input name="slug" required maxLength={160} className={adminFieldClass} placeholder="primeren-adres" />
          </label>
          <label className="text-sm font-medium text-boutique-ink md:col-span-2">
            Кратко описание
            <textarea name="excerpt" required rows={2} maxLength={320} className={`${adminFieldClass} resize-y`} />
          </label>
          <label className="text-sm font-medium text-boutique-ink md:col-span-2">
            Пълен текст
            <textarea name="content" required rows={9} className={`${adminFieldClass} resize-y`} />
            <p className={adminHelperClass}>Натискайте Enter за нов ред. Празен ред добавя по-голям интервал между абзаците.</p>
          </label>
          <label className="text-sm font-medium text-boutique-ink">
            Тип
            <select name="event_type" className={adminFieldClass} defaultValue="">
              <option value="">Изберете</option>
              {["Работилница", "Базар", "Изложба", "Специално събитие"].map((value) => (
                <option key={value}>{value}</option>
              ))}
            </select>
          </label>
          <label className="text-sm font-medium text-boutique-ink">
            За кого
            <select name="audience" className={adminFieldClass} defaultValue="">
              <option value="">Изберете</option>
              {["Деца", "Възрастни", "Семейства"].map((value) => (
                <option key={value}>{value}</option>
              ))}
            </select>
          </label>
          <label className="text-sm font-medium text-boutique-ink">
            Формат
            <select name="format" className={adminFieldClass} defaultValue="in_person">
              <option value="in_person">На място</option>
              <option value="online">Онлайн</option>
            </select>
          </label>
          <label className="text-sm font-medium text-boutique-ink">
            Цена (EUR)
            <input name="price" type="number" min="0" step="0.01" className={adminFieldClass} />
          </label>
          <label className="text-sm font-medium text-boutique-ink">
            Максимални места
            <input name="capacity" type="number" min="1" className={adminFieldClass} />
          </label>
          <label className="text-sm font-medium text-boutique-ink">
            Свободни места
            <input name="available_spots" type="number" min="0" className={adminFieldClass} />
            <p className={adminHelperClass}>При ново събитие може да остане празно и ще бъде равно на максималните места.</p>
          </label>
          <label className="text-sm font-medium text-boutique-ink">Възрастова група<input name="age_group" className={adminFieldClass} /></label>
          <label className="text-sm font-medium text-boutique-ink">Адрес<input name="address" className={adminFieldClass} /></label>
          <label className="text-sm font-medium text-boutique-ink">Продължителност (минути)<input name="duration_minutes" type="number" min="1" className={adminFieldClass} /></label>
          <label className="text-sm font-medium text-boutique-ink">Водещ<input name="host_name" className={adminFieldClass} /></label>
          <label className="text-sm font-medium text-boutique-ink md:col-span-2">Какво е включено<textarea name="includes_text" rows={2} className={`${adminFieldClass} resize-y`} /></label>
          <label className="text-sm font-medium text-boutique-ink md:col-span-2">Необходими материали<textarea name="materials_text" rows={2} className={`${adminFieldClass} resize-y`} /></label>
          <label className="text-sm font-medium text-boutique-ink md:col-span-2">Условия за отказ<textarea name="cancellation_policy" rows={2} className={`${adminFieldClass} resize-y`} /></label>
          <label className="text-sm font-medium text-boutique-ink md:col-span-2">Линк за записване<input name="registration_url" type="url" className={adminFieldClass} /></label>
          <label className="text-sm font-medium text-boutique-ink">
            Място
            <input name="location" maxLength={200} className={adminFieldClass} />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-medium text-boutique-ink">
              Начало
              <input name="starts_at" type="datetime-local" className={adminFieldClass} />
            </label>
            <label className="text-sm font-medium text-boutique-ink">
              Край
              <input name="ends_at" type="datetime-local" className={adminFieldClass} />
            </label>
          </div>
          <ImageFileInput
            name="image_file"
            label="Основна снимка"
            className={adminFieldClass}
            helperClassName={adminHelperClass}
            helperText="PNG, JPG, WEBP или SVG до 5 MB."
          />
          <label className="inline-flex items-center gap-2 self-center text-sm text-boutique-ink">
            <input name="is_published" type="checkbox" className="h-4 w-4 accent-boutique-ink" />
            Публикувай веднага
          </label>
          <div className="md:col-span-2">
            <button type="submit" className="rounded-full bg-boutique-ink px-6 py-3 text-xs font-semibold uppercase tracking-wider text-boutique-paper transition hover:bg-boutique-accent">
              Добави събитие
            </button>
          </div>
        </form>
      </AdminSectionAccordion>

      <section className={adminPanelClass}>
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h2 className="font-heading text-2xl text-boutique-ink">Събития</h2>
          <span className="text-xs text-boutique-muted">
            {items.length} {items.length === 1 ? "запис" : "записа"}
          </span>
        </div>
        <EventListView events={items} />
      </section>
    </div>
  );
}
