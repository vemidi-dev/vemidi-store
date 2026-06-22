import {
  createBlogPost,
  createEvent,
  deleteBlogPost,
  deleteEvent,
  publishBlogPost,
  saveBlogPostDraft,
  updateBlogPost,
  updateEvent,
} from "@/app/admin/content-actions";
import { ImageFileInput } from "@/components/admin/image-file-input";
import { adminFieldClass, adminHelperClass, adminPanelClass } from "@/components/admin/styles";
import type { BlogPostRow, CategoryRow, EventRow } from "@/lib/admin/types";

type ContentManagementPanelProps =
  | {
      kind: "blog";
      items: BlogPostRow[];
      categories: CategoryRow[];
      error: { message: string } | null;
    }
  | { kind: "events"; items: EventRow[]; error: { message: string } | null };

function toDateTimeLocal(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

export function ContentManagementPanel(props: ContentManagementPanelProps) {
  const isBlog = props.kind === "blog";
  const createAction = isBlog ? createBlogPost : createEvent;
  const updateAction = isBlog ? updateBlogPost : updateEvent;
  const deleteAction = isBlog ? deleteBlogPost : deleteEvent;
  const singular = isBlog ? "публикация" : "събитие";
  const productCategories = props.kind === "blog"
    ? props.categories.filter((category) => category.category_type === "product")
    : [];
  const blogCategories = props.kind === "blog"
    ? [...new Set(props.items.map((item) => item.category).filter(Boolean))] as string[]
    : [];

  return (
    <div className="space-y-6">
      {props.error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
          Данните не могат да се заредят: {props.error.message}. Изпълнете SQL миграцията за блог и събития.
        </div>
      ) : null}

      <section className={adminPanelClass}>
        <h2 className="font-heading text-2xl text-boutique-ink">
          Добавяне на {singular}
        </h2>
        <form action={createAction} className="mt-6 grid gap-5 md:grid-cols-2">
          <input type="hidden" name="tab" value={props.kind} />
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
            <textarea name="excerpt" required={!isBlog} rows={2} maxLength={320} className={`${adminFieldClass} resize-y`} />
            {isBlog ? <p className={adminHelperClass}>Задължително при публикуване; може да остане празно в чернова.</p> : null}
          </label>
          <label className="text-sm font-medium text-boutique-ink md:col-span-2">
            Пълен текст
            <textarea name="content" required={!isBlog} rows={9} className={`${adminFieldClass} resize-y`} />
          <p className={adminHelperClass}>Натискайте Enter за нов ред. Празен ред добавя по-голям интервал между абзаците.</p>
          </label>
          {isBlog ? (
            <>
              <label className="text-sm font-medium text-boutique-ink">
                Категория
                <input
                  name="category"
                  list="blog-category-suggestions"
                  maxLength={100}
                  className={adminFieldClass}
                  placeholder="Напр. Идеи за подаръци"
                />
                <datalist id="blog-category-suggestions">
                  {blogCategories.map((category) => <option key={category} value={category} />)}
                </datalist>
                <p className={adminHelperClass}>Въведете собствено име на блог категория.</p>
              </label>
              <label className="text-sm font-medium text-boutique-ink">
                Автор
                <input name="author" defaultValue="VeMiDi crafts" className={adminFieldClass} />
              </label>
              <label className="text-sm font-medium text-boutique-ink">
                Време за четене (минути)
                <input name="read_minutes" type="number" min="1" className={adminFieldClass} />
              </label>
              <div className="flex flex-wrap items-center gap-5">
                <label className="inline-flex items-center gap-2 text-sm"><input name="is_featured" type="checkbox" /> Водеща статия</label>
                <label className="inline-flex items-center gap-2 text-sm"><input name="is_popular" type="checkbox" /> Популярна</label>
              </div>
              <label className="text-sm font-medium text-boutique-ink">
                Име на линка под статията
                <input
                  name="cta_link_label"
                  maxLength={100}
                  className={adminFieldClass}
                  placeholder="Напр. Разгледай подаръците"
                />
              </label>
              <label className="text-sm font-medium text-boutique-ink">
                Линкът да води към
                <select name="cta_category_id" className={adminFieldClass} defaultValue="">
                  <option value="">Без линк към категория</option>
                  {productCategories.map((category) => (
                    <option key={category.id} value={category.id}>{category.name}</option>
                  ))}
                </select>
                <p className={adminHelperClass}>Избира се категория от продуктовия каталог.</p>
              </label>
            </>
          ) : (
            <>
              <label className="text-sm font-medium text-boutique-ink">
                Тип
                <select name="event_type" className={adminFieldClass} defaultValue="">
                  <option value="">Изберете</option>
                  {["Работилница", "Базар", "Изложба", "Специално събитие"].map((value) => <option key={value}>{value}</option>)}
                </select>
              </label>
              <label className="text-sm font-medium text-boutique-ink">
                За кого
                <select name="audience" className={adminFieldClass} defaultValue="">
                  <option value="">Изберете</option>
                  {["Деца", "Възрастни", "Семейства"].map((value) => <option key={value}>{value}</option>)}
                </select>
              </label>
              <label className="text-sm font-medium text-boutique-ink">
                Формат
                <select name="format" className={adminFieldClass} defaultValue="in_person">
                  <option value="in_person">На място</option>
                  <option value="online">Онлайн</option>
                </select>
              </label>
              <label className="text-sm font-medium text-boutique-ink">Цена (EUR)<input name="price" type="number" min="0" step="0.01" className={adminFieldClass} /></label>
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
            </>
          )}
          {!isBlog ? (
            <>
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
            </>
          ) : null}
          <ImageFileInput
            name="image_file"
            label="Основна снимка"
            className={adminFieldClass}
            helperClassName={adminHelperClass}
            helperText="PNG, JPG, WEBP или SVG до 5 MB."
          />
          {!isBlog ? (
            <label className="inline-flex items-center gap-2 self-center text-sm text-boutique-ink">
              <input name="is_published" type="checkbox" className="h-4 w-4 accent-boutique-ink" />
              Публикувай веднага
            </label>
          ) : null}
          <div className="md:col-span-2">
            {isBlog ? (
              <div className="flex flex-wrap gap-3">
                <button name="submit_intent" value="draft" type="submit" className="rounded-full border border-boutique-line px-6 py-3 text-xs font-semibold uppercase tracking-wider text-boutique-ink transition hover:border-boutique-accent">
                  Запази като чернова
                </button>
                <button name="submit_intent" value="publish" type="submit" className="rounded-full bg-boutique-ink px-6 py-3 text-xs font-semibold uppercase tracking-wider text-boutique-paper transition hover:bg-boutique-accent">
                  Публикувай
                </button>
              </div>
            ) : (
              <button type="submit" className="rounded-full bg-boutique-ink px-6 py-3 text-xs font-semibold uppercase tracking-wider text-boutique-paper transition hover:bg-boutique-accent">
                Добави {singular}
              </button>
            )}
          </div>
        </form>
      </section>

      <section className={adminPanelClass}>
        <h2 className="font-heading text-2xl text-boutique-ink">
          {isBlog ? "Публикации" : "Събития"}
        </h2>
        {props.items.length === 0 ? (
          <p className="mt-5 text-sm text-boutique-muted">Все още няма добавено съдържание.</p>
        ) : (
          <div className="mt-6 space-y-5">
            {props.items.map((item) => {
              const event = isBlog ? null : (item as EventRow);
              const blogPost = isBlog ? (item as BlogPostRow) : null;
              const currentCtaCategoryIsMissing = Boolean(
                blogPost?.cta_category_id &&
                !productCategories.some((category) => category.id === blogPost.cta_category_id),
              );
              return (
                <article key={item.id} className="rounded-xl border border-boutique-line bg-boutique-bg p-5">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-boutique-muted">
                        {item.is_published ? "Публикувано" : "Чернова"}
                      </p>
                      <h3 className="mt-2 font-heading text-xl text-boutique-ink">{item.title}</h3>
                      <p className="mt-2 text-sm text-boutique-muted">{item.excerpt}</p>
                    </div>
                    <form action={deleteAction}>
                      <input type="hidden" name="tab" value={props.kind} />
                      <input type="hidden" name="id" value={item.id} />
                      <button type="submit" className="rounded-full border border-red-300 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-red-700 hover:bg-red-50">
                        Изтрий
                      </button>
                    </form>
                  </div>

                  <details className="mt-5 rounded-lg border border-boutique-line bg-boutique-paper p-4">
                    <summary className="cursor-pointer text-sm font-semibold text-boutique-ink">
                      Редактирай
                    </summary>
                    <form action={updateAction} className="mt-5 grid gap-5 md:grid-cols-2">
                      <input type="hidden" name="tab" value={props.kind} />
                      <input type="hidden" name="id" value={item.id} />
                      <input type="hidden" name="existing_image_url" value={item.image_url ?? ""} />
                      <label className="text-sm font-medium text-boutique-ink">
                        Заглавие
                        <input name="title" required defaultValue={item.title} className={adminFieldClass} />
                      </label>
                      <label className="text-sm font-medium text-boutique-ink">
                        Slug
                        <input name="slug" required defaultValue={item.slug} className={adminFieldClass} />
                      </label>
                      <label className="text-sm font-medium text-boutique-ink md:col-span-2">
                        Кратко описание
                        <textarea name="excerpt" required={!isBlog} rows={2} defaultValue={item.excerpt} className={`${adminFieldClass} resize-y`} />
                      </label>
                      <label className="text-sm font-medium text-boutique-ink md:col-span-2">
                        Пълен текст
                        <textarea name="content" required={!isBlog} rows={9} defaultValue={item.content} className={`${adminFieldClass} resize-y`} />
                      </label>
                      {isBlog ? (
                        <>
                          <label className="text-sm font-medium text-boutique-ink">Категория<input name="category" list="blog-category-suggestions" defaultValue={(item as BlogPostRow).category ?? ""} className={adminFieldClass} /></label>
                          <label className="text-sm font-medium text-boutique-ink">Автор<input name="author" defaultValue={(item as BlogPostRow).author ?? "VeMiDi crafts"} className={adminFieldClass} /></label>
                          <label className="text-sm font-medium text-boutique-ink">Време за четене<input name="read_minutes" type="number" min="1" defaultValue={(item as BlogPostRow).read_minutes ?? ""} className={adminFieldClass} /></label>
                          <div className="flex flex-wrap items-center gap-5">
                            <label className="inline-flex items-center gap-2 text-sm"><input name="is_featured" type="checkbox" defaultChecked={(item as BlogPostRow).is_featured} /> Водеща</label>
                            <label className="inline-flex items-center gap-2 text-sm"><input name="is_popular" type="checkbox" defaultChecked={(item as BlogPostRow).is_popular} /> Популярна</label>
                          </div>
                          <label className="text-sm font-medium text-boutique-ink">
                            Име на линка под статията
                            <input name="cta_link_label" maxLength={100} defaultValue={(item as BlogPostRow).cta_link_label ?? ""} className={adminFieldClass} />
                          </label>
                          <label className="text-sm font-medium text-boutique-ink">
                            Линкът да води към
                            <select name="cta_category_id" defaultValue={(item as BlogPostRow).cta_category_id ?? ""} className={adminFieldClass}>
                              <option value="">Без линк към категория</option>
                              {currentCtaCategoryIsMissing && blogPost?.cta_category_id ? (
                                <option value={blogPost.cta_category_id}>
                                  Текущата категория (провери типа ѝ)
                                </option>
                              ) : null}
                              {productCategories.map((category) => (
                                <option key={category.id} value={category.id}>{category.name}</option>
                              ))}
                            </select>
                            {currentCtaCategoryIsMissing ? (
                              <p className="mt-2 text-xs text-amber-700">
                                Категорията на стария линк не е в списъка с продуктови категории. Може да я запазите временно или да изберете друга.
                              </p>
                            ) : null}
                          </label>
                        </>
                      ) : event ? (
                        <>
                          <label className="text-sm font-medium text-boutique-ink">Тип<input name="event_type" defaultValue={event.event_type ?? ""} className={adminFieldClass} /></label>
                          <label className="text-sm font-medium text-boutique-ink">Аудитория<input name="audience" defaultValue={event.audience ?? ""} className={adminFieldClass} /></label>
                          <label className="text-sm font-medium text-boutique-ink">Формат<select name="format" defaultValue={event.format ?? "in_person"} className={adminFieldClass}><option value="in_person">На място</option><option value="online">Онлайн</option></select></label>
                          <label className="text-sm font-medium text-boutique-ink">Цена<input name="price" type="number" step="0.01" defaultValue={event.price ?? ""} className={adminFieldClass} /></label>
                          <label className="text-sm font-medium text-boutique-ink">
                            Капацитет
                            <input name="capacity" type="number" min="1" defaultValue={event.capacity ?? ""} className={adminFieldClass} />
                          </label>
                          <label className="text-sm font-medium text-boutique-ink">
                            Свободни места
                            <input name="available_spots" type="number" min="0" max={event.capacity ?? undefined} defaultValue={event.available_spots ?? ""} className={adminFieldClass} />
                            <p className={adminHelperClass}>Полето се намалява автоматично при записване и се увеличава при отказ.</p>
                          </label>
                          <label className="text-sm font-medium text-boutique-ink">Възраст<input name="age_group" defaultValue={event.age_group ?? ""} className={adminFieldClass} /></label>
                          <label className="text-sm font-medium text-boutique-ink">Адрес<input name="address" defaultValue={event.address ?? ""} className={adminFieldClass} /></label>
                          <label className="text-sm font-medium text-boutique-ink">Продължителност<input name="duration_minutes" type="number" defaultValue={event.duration_minutes ?? ""} className={adminFieldClass} /></label>
                          <label className="text-sm font-medium text-boutique-ink">Водещ<input name="host_name" defaultValue={event.host_name ?? ""} className={adminFieldClass} /></label>
                          <label className="text-sm font-medium text-boutique-ink md:col-span-2">Включено<textarea name="includes_text" defaultValue={event.includes_text ?? ""} className={adminFieldClass} /></label>
                          <label className="text-sm font-medium text-boutique-ink md:col-span-2">Материали<textarea name="materials_text" defaultValue={event.materials_text ?? ""} className={adminFieldClass} /></label>
                          <label className="text-sm font-medium text-boutique-ink md:col-span-2">Отказ<textarea name="cancellation_policy" defaultValue={event.cancellation_policy ?? ""} className={adminFieldClass} /></label>
                          <label className="text-sm font-medium text-boutique-ink md:col-span-2">Линк за записване<input name="registration_url" type="url" defaultValue={event.registration_url ?? ""} className={adminFieldClass} /></label>
                        </>
                      ) : null}
                      {event ? (
                        <>
                          <label className="text-sm font-medium text-boutique-ink">
                            Място
                            <input name="location" defaultValue={event.location ?? ""} className={adminFieldClass} />
                          </label>
                          <div className="grid gap-4 sm:grid-cols-2">
                            <label className="text-sm font-medium text-boutique-ink">
                              Начало
                              <input name="starts_at" type="datetime-local" defaultValue={toDateTimeLocal(event.starts_at)} className={adminFieldClass} />
                            </label>
                            <label className="text-sm font-medium text-boutique-ink">
                              Край
                              <input name="ends_at" type="datetime-local" defaultValue={toDateTimeLocal(event.ends_at)} className={adminFieldClass} />
                            </label>
                          </div>
                        </>
                      ) : null}
                      <ImageFileInput
                        name="image_file"
                        label="Нова снимка (по избор)"
                        className={adminFieldClass}
                        helperClassName={adminHelperClass}
                        helperText="Оставете празно, за да запазите текущата снимка."
                      />
                      {!isBlog ? (
                        <label className="inline-flex items-center gap-2 self-center text-sm text-boutique-ink">
                          <input name="is_published" type="checkbox" defaultChecked={item.is_published} className="h-4 w-4 accent-boutique-ink" />
                          Публикувано
                        </label>
                      ) : null}
                      <div className="md:col-span-2">
                        {isBlog ? (
                          <div className="flex flex-wrap gap-3">
                            <button
                              formAction={saveBlogPostDraft}
                              type="submit"
                              className="rounded-full border border-boutique-line px-6 py-3 text-xs font-semibold uppercase tracking-wider text-boutique-ink hover:border-boutique-accent"
                            >
                              {item.is_published ? "Премести в чернови" : "Запази черновата"}
                            </button>
                            <button
                              formAction={publishBlogPost}
                              type="submit"
                              className="rounded-full bg-boutique-ink px-6 py-3 text-xs font-semibold uppercase tracking-wider text-boutique-paper hover:bg-boutique-accent"
                            >
                              {item.is_published ? "Запази публикуваните промени" : "Публикувай"}
                            </button>
                          </div>
                        ) : (
                          <button type="submit" className="rounded-full bg-boutique-ink px-6 py-3 text-xs font-semibold uppercase tracking-wider text-boutique-paper hover:bg-boutique-accent">
                            Запази промените
                          </button>
                        )}
                      </div>
                    </form>
                  </details>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
