import { AdminSectionAccordion } from "@/components/admin/admin-section-accordion";
import { adminFieldClass, adminHelperClass } from "@/components/admin/styles";
import {
  categoryContentLimits,
  getCategoryContentFormDefaults,
} from "@/lib/admin/category-content";
import { adminFormFields } from "@/lib/admin/form-fields";
import type { CategoryRow } from "@/lib/admin/types";

type CategoryContentSeoFieldsProps = {
  category?: Pick<
    CategoryRow,
    | "hero_description"
    | "listing_heading"
    | "intro_text"
    | "seo_body"
    | "meta_title"
    | "meta_description"
    | "og_title"
    | "og_description"
    | "robots_index"
  >;
  className?: string;
};

export function CategoryContentSeoFields({
  category,
  className = "mt-4",
}: CategoryContentSeoFieldsProps) {
  const defaults = getCategoryContentFormDefaults(category);

  return (
    <AdminSectionAccordion
      title="Съдържание и SEO"
      countLabel="Страница и метаданни"
      className={className}
    >
      <div className="grid gap-4 md:grid-cols-2">
        <label className="text-sm font-medium text-boutique-ink md:col-span-2">
          Описание в горната част
          <textarea
            name={adminFormFields.category.heroDescription}
            rows={3}
            defaultValue={defaults.hero_description}
            maxLength={categoryContentLimits.hero_description}
            className={`${adminFieldClass} min-h-24 resize-y`}
          />
          <span className={adminHelperClass}>
            Показва се в hero зоната на страницата на категорията или повода. Макс.{" "}
            {categoryContentLimits.hero_description} символа.
          </span>
        </label>

        <label className="text-sm font-medium text-boutique-ink">
          Заглавие над продуктите
          <input
            name={adminFormFields.category.listingHeading}
            type="text"
            defaultValue={defaults.listing_heading}
            maxLength={categoryContentLimits.listing_heading}
            className={adminFieldClass}
          />
          <span className={adminHelperClass}>
            Заглавие над списъка с продукти. Макс. {categoryContentLimits.listing_heading}{" "}
            символа.
          </span>
        </label>

        <label className="text-sm font-medium text-boutique-ink">
          SEO заглавие
          <input
            name={adminFormFields.category.metaTitle}
            type="text"
            defaultValue={defaults.meta_title}
            maxLength={categoryContentLimits.meta_title}
            className={adminFieldClass}
          />
          <span className={adminHelperClass}>
            HTML title за страницата. Макс. {categoryContentLimits.meta_title} символа.
          </span>
        </label>

        <label className="text-sm font-medium text-boutique-ink md:col-span-2">
          Уводен текст
          <textarea
            name={adminFormFields.category.introText}
            rows={4}
            defaultValue={defaults.intro_text}
            maxLength={categoryContentLimits.intro_text}
            className={`${adminFieldClass} min-h-28 resize-y`}
          />
          <span className={adminHelperClass}>
            Кратък увод под hero секцията. Натискайте Enter за нов ред. Макс.{" "}
            {categoryContentLimits.intro_text} символа.
          </span>
        </label>

        <label className="text-sm font-medium text-boutique-ink md:col-span-2">
          Подробен текст под продуктите
          <textarea
            name={adminFormFields.category.seoBody}
            rows={6}
            defaultValue={defaults.seo_body}
            maxLength={categoryContentLimits.seo_body}
            className={`${adminFieldClass} min-h-36 resize-y`}
          />
          <span className={adminHelperClass}>
            Дълъг SEO блок в долната част на страницата. Натискайте Enter за нов ред. Макс.{" "}
            {categoryContentLimits.seo_body} символа.
          </span>
        </label>

        <label className="text-sm font-medium text-boutique-ink">
          Meta описание
          <textarea
            name={adminFormFields.category.metaDescription}
            rows={3}
            defaultValue={defaults.meta_description}
            maxLength={categoryContentLimits.meta_description}
            className={`${adminFieldClass} min-h-20 resize-y`}
          />
          <span className={adminHelperClass}>
            Meta description за търсачките. Макс. {categoryContentLimits.meta_description}{" "}
            символа.
          </span>
        </label>

        <label className="text-sm font-medium text-boutique-ink">
          Описание при споделяне
          <textarea
            name={adminFormFields.category.ogDescription}
            rows={3}
            defaultValue={defaults.og_description}
            maxLength={categoryContentLimits.og_description}
            className={`${adminFieldClass} min-h-20 resize-y`}
          />
          <span className={adminHelperClass}>
            Open Graph описание при споделяне. Макс. {categoryContentLimits.og_description}{" "}
            символа.
          </span>
        </label>

        <label className="text-sm font-medium text-boutique-ink">
          Заглавие при споделяне
          <input
            name={adminFormFields.category.ogTitle}
            type="text"
            defaultValue={defaults.og_title}
            maxLength={categoryContentLimits.og_title}
            className={adminFieldClass}
          />
          <span className={adminHelperClass}>
            Open Graph заглавие при споделяне. Макс. {categoryContentLimits.og_title} символа.
          </span>
        </label>

        <label className="text-sm font-medium text-boutique-ink">
          Индексиране
          <select
            name={adminFormFields.category.robotsIndex}
            defaultValue={defaults.robots_index}
            className={adminFieldClass}
          >
            <option value="auto">Автоматично</option>
            <option value="true">Индексирай</option>
            <option value="false">Не индексирай</option>
          </select>
          <span className={adminHelperClass}>
            Автоматично запазва текущите правила за indexability на сайта.
          </span>
        </label>
      </div>
    </AdminSectionAccordion>
  );
}
