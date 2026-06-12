import { updateSiteContent } from "@/app/admin/site-content-actions";
import { AdminSectionAccordion } from "@/components/admin/admin-section-accordion";
import {
  adminFieldClass,
  adminHelperClass,
  adminPanelClass,
} from "@/components/admin/styles";
import type { SiteContentRow } from "@/lib/content/site-content";

function fieldCountLabel(count: number): string {
  if (count === 1) {
    return "1 поле";
  }
  return `${count} полета`;
}

export function SiteContentManagementPanel({
  fields,
  error,
}: {
  fields: SiteContentRow[];
  error: string | null;
}) {
  const sections = Map.groupBy(fields, (field) => field.section);

  return (
    <section className={adminPanelClass}>
      <h2 className="font-heading text-2xl text-boutique-ink">
        Съдържание на сайта
      </h2>
      <p className="mt-2 max-w-3xl text-sm leading-relaxed text-boutique-muted">
        Тук се редактират текстове и контактни данни, без промяна по кода.
        Секциите са сгънати по подразбиране — отворете само тези, които искате да промените.
      </p>

      {error ? (
        <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          Данните не могат да се заредят. Изпълнете
          {" "}
          <strong>site_content_settings.sql</strong> в Supabase.
        </div>
      ) : (
        <form action={updateSiteContent} className="mt-7 space-y-3">
          {[...sections.entries()].map(([section, sectionFields]) => (
            <AdminSectionAccordion
              key={section}
              title={section}
              countLabel={fieldCountLabel(sectionFields.length)}
            >
              <div className="grid gap-4 lg:grid-cols-2">
                {sectionFields.map((field) => (
                  <label
                    key={field.key}
                    className={`text-sm font-medium text-boutique-ink ${
                      field.is_multiline ? "lg:col-span-2" : ""
                    }`}
                  >
                    {field.label}
                    {field.is_multiline ? (
                      <textarea
                        name={`content:${field.key}`}
                        defaultValue={field.value}
                        rows={4}
                        maxLength={5000}
                        className={`${adminFieldClass} resize-y`}
                      />
                    ) : (
                      <input
                        name={`content:${field.key}`}
                        defaultValue={field.value}
                        maxLength={5000}
                        className={adminFieldClass}
                      />
                    )}
                    <span className={adminHelperClass}>{field.key}</span>
                  </label>
                ))}
              </div>
            </AdminSectionAccordion>
          ))}

          <button
            type="submit"
            className="rounded-full bg-boutique-ink px-6 py-3 text-xs font-semibold uppercase tracking-wider text-boutique-paper transition hover:bg-boutique-accent"
          >
            Запази съдържанието
          </button>
        </form>
      )}
    </section>
  );
}
