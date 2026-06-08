import { adminLogout } from "@/app/admin/login/actions";
import { makeAdminTabHref } from "@/lib/admin/params";
import type { AdminTab } from "@/lib/admin/types";

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
              type="submit"
              className="rounded-full border border-boutique-line px-4 py-2 text-xs font-semibold uppercase tracking-wider text-boutique-ink transition hover:border-boutique-accent/40"
            >
              Изход
            </button>
          </form>
        </div>
      </div>

      <nav
        aria-label="Админ секции"
        className="inline-flex rounded-full border border-boutique-line bg-boutique-paper p-1"
      >
        <a
          href={makeAdminTabHref("products")}
          className={`rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-wider transition ${
            activeTab === "products"
              ? "bg-boutique-ink text-boutique-paper"
              : "text-boutique-ink hover:bg-boutique-bg"
          }`}
        >
          Управление на продукти
        </a>
        <a
          href={makeAdminTabHref("categories")}
          className={`rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-wider transition ${
            activeTab === "categories"
              ? "bg-boutique-ink text-boutique-paper"
              : "text-boutique-ink hover:bg-boutique-bg"
          }`}
        >
          Управление на категории
        </a>
        <a
          href={makeAdminTabHref("orders")}
          className={`rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-wider transition ${
            activeTab === "orders"
              ? "bg-boutique-ink text-boutique-paper"
              : "text-boutique-ink hover:bg-boutique-bg"
          }`}
        >
          Поръчки
        </a>
      </nav>
    </>
  );
}
