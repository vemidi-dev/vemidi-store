import { redirect } from "next/navigation";

import { AdminHeader } from "@/components/admin/admin-header";
import { AdminNotices } from "@/components/admin/admin-notices";
import { CategoryManagementPanel } from "@/components/admin/category-management-panel";
import { ProductCreatePanel } from "@/components/admin/product-create-panel";
import { ProductListPanel } from "@/components/admin/product-list-panel";
import { OrdersPanel } from "@/components/admin/orders-panel";
import { ContentManagementPanel } from "@/components/admin/content-management-panel";
import { EventRegistrationsPanel } from "@/components/admin/event-registrations-panel";
import { PageContainer } from "@/components/layout/page-container";
import { loadAdminData } from "@/lib/admin/data";
import {
  firstValue,
  normalizeAdminTab,
  parseProductCreateDraft,
} from "@/lib/admin/params";
import { checkIsAdmin } from "@/lib/supabase/admin-auth";
import { createClient } from "@/lib/supabase/server";
import { loadOrders } from "@/lib/admin/orders";

type AdminPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function redirectToAdminLogin(message: string): never {
  redirect(`/admin/login?message=${encodeURIComponent(message)}`);
}

export default async function AdminPage({ searchParams }: AdminPageProps) {
  const params = await searchParams;
  const success = firstValue(params.success);
  const error = firstValue(params.error);
  const draft = parseProductCreateDraft(firstValue(params.draft));
  const activeTab = normalizeAdminTab(firstValue(params.tab));
  const orderStatus = firstValue(params.status);
  const orderSearch = firstValue(params.q);

  const supabase = await createClient();
  if (!supabase) {
    return (
      <section className="pb-24 pt-10">
        <PageContainer>
          <div className="rounded-xl border border-red-200 bg-red-50 px-6 py-5 text-sm text-red-700">
            Supabase не е конфигуриран. Добавете `NEXT_PUBLIC_SUPABASE_URL` и
            `NEXT_PUBLIC_SUPABASE_ANON_KEY` в `.env.local`.
          </div>
        </PageContainer>
      </section>
    );
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirectToAdminLogin("Моля, влезте като администратор.");
  }

  const { isAdmin, error: adminCheckError } = await checkIsAdmin(supabase, user.id);
  if (adminCheckError) {
    redirectToAdminLogin(
      "Липсва admin_users таблица или достъп. Изпълнете SQL скрипта за админи.",
    );
  }
  if (!isAdmin) {
    redirectToAdminLogin("Този профил няма админ права.");
  }

  if (activeTab === "orders") {
    const ordersResult = await loadOrders(supabase, orderStatus, orderSearch);

    return (
      <section className="pb-24 pt-10">
        <PageContainer>
          <div className="mx-auto max-w-6xl space-y-8">
            <AdminHeader activeTab={activeTab} />
            {success || error ? (
              <div
                className={`rounded-xl border px-4 py-3 text-sm ${
                  error
                    ? "border-red-200 bg-red-50 text-red-700"
                    : "border-emerald-200 bg-emerald-50 text-emerald-700"
                }`}
              >
                {error || success}
              </div>
            ) : null}
            <OrdersPanel
              orders={ordersResult.orders}
              status={orderStatus}
              search={orderSearch}
              error={ordersResult.error}
            />
          </div>
        </PageContainer>
      </section>
    );
  }

  if (activeTab === "blog" || activeTab === "events") {
    const table = activeTab === "blog" ? "blog_posts" : "events";
    const orderColumn = activeTab === "blog" ? "created_at" : "starts_at";
    const [result, categoriesResult, registrationsResult] = await Promise.all([
      supabase
        .from(table)
        .select("*")
        .order(orderColumn, { ascending: false, nullsFirst: false }),
      activeTab === "blog"
        ? supabase.from("categories").select("id,name,slug,category_type").order("name")
        : Promise.resolve({ data: [], error: null }),
      activeTab === "events"
        ? supabase
            .from("event_registrations")
            .select("*")
            .order("created_at", { ascending: false })
        : Promise.resolve({ data: [], error: null }),
    ]);

    return (
      <section className="pb-24 pt-10">
        <PageContainer>
          <div className="mx-auto max-w-6xl space-y-8">
            <AdminHeader activeTab={activeTab} />
            {success || error ? (
              <div
                className={`rounded-xl border px-4 py-3 text-sm ${
                  error
                    ? "border-red-200 bg-red-50 text-red-700"
                    : "border-emerald-200 bg-emerald-50 text-emerald-700"
                }`}
              >
                {error || success}
              </div>
            ) : null}
            {activeTab === "blog" ? (
              <ContentManagementPanel
                kind="blog"
                items={(result.data ?? []) as import("@/lib/admin/types").BlogPostRow[]}
                categories={(categoriesResult.data ?? []) as import("@/lib/admin/types").CategoryRow[]}
                error={result.error}
              />
            ) : (
              <>
                <ContentManagementPanel
                  kind="events"
                  items={(result.data ?? []) as import("@/lib/admin/types").EventRow[]}
                  error={result.error}
                />
                <EventRegistrationsPanel
                  events={(result.data ?? []) as import("@/lib/admin/types").EventRow[]}
                  registrations={(registrationsResult.data ?? []) as import("@/lib/admin/types").EventRegistrationRow[]}
                  error={registrationsResult.error}
                />
              </>
            )}
          </div>
        </PageContainer>
      </section>
    );
  }

  const data = await loadAdminData(supabase);

  return (
    <section className="pb-24 pt-10">
      <PageContainer>
        <div className="mx-auto max-w-6xl space-y-8">
          <AdminHeader activeTab={activeTab} />
          <AdminNotices success={success} error={error} errors={data.errors} />

          {activeTab === "categories" ? (
            <CategoryManagementPanel categories={data.categories} />
          ) : (
            <>
              <ProductCreatePanel
                categories={data.categories}
                colorGroups={data.colorGroups}
                colorOptions={data.colorOptions}
                draft={draft}
              />
              <ProductListPanel data={data} />
            </>
          )}
        </div>
      </PageContainer>
    </section>
  );
}
