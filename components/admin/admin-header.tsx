import { adminLogout } from "@/app/admin/login/actions";
import { makeAdminTabHref } from "@/lib/admin/params";
import type { AdminTab } from "@/lib/admin/types";

const managementTabs: Array<{ tab: AdminTab; label: string }> = [
  { tab: "products", label: "Продукти" },
  { tab: "categories", label: "Категории" },
  { tab: "colors", label: "Цветове" },
  { tab: "promotions", label: "Промоции" },
  { tab: "blog", label: "Блог" },
  { tab: "events", label: "Събития" },
  { tab: "wishes", label: "Пожелания" },
  { tab: "subscribers", label: "Абонаменти" },
  { tab: "content", label: "Текстове" },
];

function AdminTabLink({
  activeTab,
  label,
  tab,
}: {
  activeTab: AdminTab;
  label: string;
  tab: AdminTab;
}) {
  return (
    <a
      className={`rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-wider transition ${
        activeTab === tab
          ? "bg-boutique-ink text-boutique-paper"
          : "text-boutique-ink hover:bg-boutique-bg"
      }`}
      href={makeAdminTabHref(tab)}
    >
      {label}
    </a>
  );
}

export function AdminHeader({ activeTab }: { activeTab: AdminTab }) {
  return (
    <>
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-boutique-accent">
          Админ
        </p>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <h1 className="font-heading text-3xl text-boutique-ink">Админ панел</h1>
          <form action={adminLogout}>
            <button
              className="rounded-full border border-boutique-line px-4 py-2 text-xs font-semibold uppercase tracking-wider text-boutique-ink transition hover:border-boutique-accent/40"
              type="submit"
            >
              Изход
            </button>
          </form>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
          <p className="shrink-0 text-[0.65rem] font-semibold uppercase tracking-[0.22em] text-boutique-sage-deep">
            Продажби
          </p>
          <div
            aria-hidden
            className="hidden h-px flex-1 bg-boutique-line sm:block"
          />
        </div>
        <nav
          aria-label="Продажби"
          className="flex w-full flex-wrap gap-1 rounded-2xl border border-boutique-sage-deep/30 bg-boutique-sage-deep/10 p-1 sm:w-fit sm:rounded-full"
        >
          <AdminTabLink activeTab={activeTab} label="Поръчки" tab="orders" />
          <AdminTabLink activeTab={activeTab} label="Отказ от договор" tab="withdrawals" />
        </nav>
      </div>

      <div className="space-y-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
          <p className="shrink-0 text-[0.65rem] font-semibold uppercase tracking-[0.22em] text-boutique-muted">
            Съдържание
          </p>
          <div
            aria-hidden
            className="hidden h-px flex-1 bg-boutique-line sm:block"
          />
        </div>
        <nav
          aria-label="Управление на съдържанието"
          className="flex w-full flex-wrap gap-1 rounded-2xl border border-boutique-line bg-boutique-paper p-1"
        >
          {managementTabs.map((item) => (
            <AdminTabLink activeTab={activeTab} key={item.tab} {...item} />
          ))}
        </nav>
      </div>
    </>
  );
}
