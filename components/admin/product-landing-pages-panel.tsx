import {
  deleteProductLandingPage,
  upsertProductLandingPage,
} from "@/app/admin/landing-page-actions";
import { AdminConfirmForm } from "@/components/admin/admin-confirm-form";
import { ProductLandingPageFormFields } from "@/components/admin/product-landing-page-form-fields";
import {
  adminHelperClass,
  adminPanelClass,
} from "@/components/admin/styles";
import { adminFormFields } from "@/lib/admin/form-fields";
import { LANDING_PAGES_MIGRATION_WARNING } from "@/lib/product-landing/admin-rpc";
import { buildProductLandingUrl, getLandingBaseUrl } from "@/lib/product-landing/url";
import type { ProductLandingPageRow } from "@/lib/product-landing/types";

type ProductLandingPagesPanelProps = {
  productId: string;
  productSlug: string;
  landingPages: ProductLandingPageRow[];
  migrationMissing: boolean;
};

function formatLandingStatus(landingPage: ProductLandingPageRow) {
  const parts = [landingPage.is_active ? "Активна" : "Неактивна"];
  if (landingPage.is_primary) {
    parts.push("Primary");
  }
  return parts.join(" · ");
}

export function ProductLandingPagesPanel({
  productId,
  productSlug,
  landingPages,
  migrationMissing,
}: ProductLandingPagesPanelProps) {
  const landingBaseUrl = getLandingBaseUrl();

  return (
    <section className={`${adminPanelClass} mt-5 border-t border-boutique-line/70 pt-5`}>
      <div>
        <h4 className="font-semibold text-boutique-ink">Landing страници</h4>
        <p className="mt-1 text-xs text-boutique-muted">
          Управление на campaign landing URL-и на{" "}
          <span className="font-mono">{landingBaseUrl.origin}/{"{slug}"}</span>. Primary
          landing ще се използва от продуктовата страница в следващ етап.
        </p>
      </div>

      {migrationMissing ? (
        <p
          role="status"
          className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
        >
          {LANDING_PAGES_MIGRATION_WARNING}
        </p>
      ) : null}

      {landingPages.length === 0 ? (
        <p className="mt-4 text-sm text-boutique-muted">
          Този продукт все още няма landing страници.
        </p>
      ) : (
        <div className="mt-4 space-y-3">
          {landingPages.map((landingPage) => {
            const landingUrl =
              buildProductLandingUrl(landingPage.slug, landingBaseUrl) ??
              `${landingBaseUrl.origin}/${landingPage.slug}`;

            return (
              <article
                key={landingPage.id}
                className="rounded-xl border border-boutique-line bg-white p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h5 className="font-medium text-boutique-ink">{landingPage.title}</h5>
                    <p className="mt-1 font-mono text-xs text-boutique-muted">
                      {landingUrl}
                    </p>
                    <p className="mt-2 text-xs text-boutique-muted">
                      Slug: {landingPage.slug}
                      {landingPage.campaign_code
                        ? ` · Campaign: ${landingPage.campaign_code}`
                        : ""}
                      {" · "}
                      {formatLandingStatus(landingPage)}
                      {" · "}
                      Подредба: {landingPage.sort_order}
                    </p>
                  </div>
                </div>

                <details className="mt-4 rounded-lg border border-boutique-line/70 bg-boutique-bg/40">
                  <summary className="cursor-pointer px-3 py-2 text-xs font-semibold text-boutique-sage-deep">
                    Редактирай landing
                  </summary>
                  <form action={upsertProductLandingPage} className="grid gap-4 p-4 md:grid-cols-2">
                    <input type="hidden" name={adminFormFields.common.tab} value="products" />
                    <input
                      type="hidden"
                      name={adminFormFields.landingPage.id}
                      value={landingPage.id}
                    />
                    <input
                      type="hidden"
                      name={adminFormFields.landingPage.productId}
                      value={productId}
                    />
                    <input
                      type="hidden"
                      name={adminFormFields.landingPage.productSlug}
                      value={productSlug}
                    />
                    <ProductLandingPageFormFields
                      initialTitle={landingPage.title}
                      initialSlug={landingPage.slug}
                      initialCampaignCode={landingPage.campaign_code}
                      initialIsPrimary={landingPage.is_primary}
                      initialIsActive={landingPage.is_active}
                      initialSortOrder={landingPage.sort_order}
                    />
                    <div className="md:col-span-2">
                      <button
                        type="submit"
                        className="rounded-full bg-boutique-ink px-5 py-2.5 text-xs font-semibold uppercase tracking-wider text-boutique-paper transition hover:bg-boutique-accent"
                      >
                        Запази landing
                      </button>
                    </div>
                  </form>
                </details>

                <AdminConfirmForm
                  action={deleteProductLandingPage}
                  confirmMessage={`Сигурни ли сте, че искате да изтриете landing „${landingPage.title}"?`}
                  className="mt-3"
                >
                  <input type="hidden" name={adminFormFields.common.tab} value="products" />
                  <input
                    type="hidden"
                    name={adminFormFields.landingPage.id}
                    value={landingPage.id}
                  />
                  <input
                    type="hidden"
                    name={adminFormFields.landingPage.productId}
                    value={productId}
                  />
                  <input
                    type="hidden"
                    name={adminFormFields.landingPage.productSlug}
                    value={productSlug}
                  />
                  <button
                    type="submit"
                    className="rounded-full border border-red-200 px-4 py-2 text-xs font-semibold text-red-700 transition hover:bg-red-50"
                  >
                    Изтрий landing
                  </button>
                </AdminConfirmForm>
              </article>
            );
          })}
        </div>
      )}

      {!migrationMissing ? (
        <details className="mt-5 rounded-lg border border-boutique-line/70 bg-boutique-bg/40">
          <summary className="cursor-pointer px-3 py-2 text-sm font-semibold text-boutique-ink">
            + Добави landing страница
          </summary>
          <form action={upsertProductLandingPage} className="grid gap-4 p-4 md:grid-cols-2">
            <input type="hidden" name={adminFormFields.common.tab} value="products" />
            <input
              type="hidden"
              name={adminFormFields.landingPage.productId}
              value={productId}
            />
            <input
              type="hidden"
              name={adminFormFields.landingPage.productSlug}
              value={productSlug}
            />
            <ProductLandingPageFormFields />
            <div className="md:col-span-2">
              <button
                type="submit"
                className="rounded-full bg-boutique-ink px-5 py-2.5 text-xs font-semibold uppercase tracking-wider text-boutique-paper transition hover:bg-boutique-accent"
              >
                Създай landing
              </button>
              <p className={`${adminHelperClass} mt-2`}>
                Ако маркирате landing като primary, тя автоматично става активна и
                премахва primary статуса от другите landing страници на същия продукт.
              </p>
            </div>
          </form>
        </details>
      ) : null}
    </section>
  );
}
