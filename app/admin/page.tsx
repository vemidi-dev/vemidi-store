import { redirect } from "next/navigation";

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

import { AdminHeader } from "@/components/admin/admin-header";
import { AdminNotices } from "@/components/admin/admin-notices";
import { CategoryManagementPanel } from "@/components/admin/category-management-panel";
import { ColorManagementPanel } from "@/components/admin/color-management-panel";
import { MaterialManagementPanel } from "@/components/admin/material-management-panel";
import { ProductCreatePanel } from "@/components/admin/product-create-panel";
import { ProductListPanel } from "@/components/admin/product-list-panel";
import { ProductOrderingPanel } from "@/components/admin/product-ordering-panel";
import { OrdersPanel } from "@/components/admin/orders-panel";
import { WithdrawalsPanel } from "@/components/admin/withdrawals-panel";
import { ContentManagementPanel } from "@/components/admin/content-management-panel";
import { BlogCategoryManagementPanel } from "@/components/admin/blog-category-management-panel";
import { EventManagementPanel } from "@/components/admin/event-management-panel";
import { EventGalleryManagementPanel } from "@/components/admin/event-gallery-management-panel";
import { EventRegistrationsPanel } from "@/components/admin/event-registrations-panel";
import { SubscriberManagementPanel } from "@/components/admin/subscriber-management-panel";
import { SiteContentManagementPanel } from "@/components/admin/site-content-management-panel";
import { SiteMediaManagementPanel } from "@/components/admin/site-media-management-panel";
import { PromotionManagementPanel } from "@/components/admin/promotion-management-panel";
import { DiscountCouponPanel } from "@/components/admin/discount-coupon-panel";
import { WishManagementPanel } from "@/components/admin/wish-management-panel";
import { FaqManagementPanel } from "@/components/admin/faq-management-panel";
import { SeoOverviewPanel } from "@/components/admin/seo-overview-panel";
import { PageContainer } from "@/components/layout/page-container";
import { loadAdminData } from "@/lib/admin/data";
import { loadAdminCategoriesData } from "@/lib/admin/categories-data";
import { loadAdminProductEditBundle } from "@/lib/admin/product-edit-data";
import { loadAdminProductLookups } from "@/lib/admin/product-lookups";
import {
  loadAdminProductsPage,
  parseProductsQuery,
} from "@/lib/admin/products-query";
import { ProductListSlimPanel } from "@/components/admin/product-list-slim-panel";
import {
  firstValue,
  normalizeAdminTab,
  normalizeFaqScopeFilter,
  parseProductCreateDraft,
} from "@/lib/admin/params";
import { buildPromotionProductOptions } from "@/lib/promotion-admin";
import { checkIsAdmin } from "@/lib/supabase/admin-auth";
import { createClient } from "@/lib/supabase/server";
import { buildOrderNotificationSummaries } from "@/lib/admin/order-notifications";
import type { OrderNotificationSummary } from "@/lib/admin/order-notifications";
import { loadOrdersPage, parseOrdersQuery } from "@/lib/admin/orders";
import type { CategoryRow, ProductRow } from "@/lib/admin/types";
import { loadWithdrawalsPage, parseWithdrawalsQuery } from "@/lib/admin/withdrawals";
import { loadOrderNotificationDeliveries } from "@/lib/orders/order-notification-outbox";
import {
  filterSubscribers,
  normalizeSubscriberStatus,
  normalizeSubscriberTopic,
} from "@/lib/admin/subscriptions";
import type { SiteMediaRow } from "@/lib/content/site-media-types";

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
  const editProductId = firstValue(params.editProduct);
  const draft = parseProductCreateDraft(firstValue(params.draft));
  const imageReselectWarning = Boolean(
    error &&
      (/качване на изображение/i.test(error) ||
        /снимките не бяха качени/i.test(error)),
  );
  const activeTab = normalizeAdminTab(firstValue(params.tab));
  const productsView = firstValue(params.productsView);
  const orderingScope = firstValue(params.orderingScope);
  const ordersQuery = parseOrdersQuery({
    status: firstValue(params.status),
    search: firstValue(params.q),
    orderId: firstValue(params.order_id),
    source: firstValue(params.source),
    dateFrom: firstValue(params.date_from),
    dateTo: firstValue(params.date_to),
    payment: firstValue(params.payment),
    delivery: firstValue(params.delivery),
    sort: firstValue(params.sort),
    page: firstValue(params.page),
    pageSize: firstValue(params.page_size),
  });
  const withdrawalsQuery = parseWithdrawalsQuery({
    status: firstValue(params.status),
    search: firstValue(params.q),
    page: firstValue(params.page),
    pageSize: firstValue(params.page_size),
  });
  const subscriberSearch = firstValue(params.subscriber_q);
  const subscriberTopic = normalizeSubscriberTopic(
    firstValue(params.subscriber_topic),
  );
  const subscriberStatus = normalizeSubscriberStatus(
    firstValue(params.subscriber_status),
  );

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

  if (activeTab === "faq") {
    const initialFaqScope = normalizeFaqScopeFilter(firstValue(params.faq_scope));
    const [groupsResult, itemsResult, groupItemsResult] = await Promise.all([
      supabase
        .from("faq_groups")
        .select("id,name,slug,scope,is_active,sort_order,created_at,updated_at")
        .order("scope", { ascending: true })
        .order("sort_order", { ascending: true }),
      supabase
        .from("faq_items")
        .select("id,question,answer,is_active,sort_order,created_at,updated_at")
        .order("sort_order", { ascending: true }),
      supabase
        .from("faq_group_items")
        .select("group_id,faq_item_id,sort_order,created_at")
        .order("sort_order", { ascending: true }),
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
            {groupsResult.error || itemsResult.error || groupItemsResult.error ? (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                FAQ данните не могат да бъдат заредени. Изпълнете faq_management.sql.
              </div>
            ) : (
              <FaqManagementPanel
                initialScope={initialFaqScope}
                groups={(groupsResult.data ?? []) as import("@/lib/faq/types").FaqGroupRow[]}
                items={(itemsResult.data ?? []) as import("@/lib/faq/types").FaqItemRow[]}
                groupItems={
                  (groupItemsResult.data ?? []) as import("@/lib/faq/types").FaqGroupItemRow[]
                }
              />
            )}
          </div>
        </PageContainer>
      </section>
    );
  }

  if (activeTab === "wishes") {
    const [categories, wishes, links] = await Promise.all([
      supabase.from("categories").select("id,name,slug,category_type,parent_id,image_url,image_alt,cover_image_url,cover_image_alt,show_on_home,home_sort_order,card_description").eq("category_type", "occasion").order("home_sort_order").order("name"),
      supabase.from("wish_templates").select("id,title,body,is_active,sort_order").order("sort_order"),
      supabase.from("wish_template_occasions").select("wish_template_id,category_id"),
    ]);
    return (
      <section className="pb-24 pt-10">
        <PageContainer>
          <div className="mx-auto max-w-6xl space-y-8">
            <AdminHeader activeTab={activeTab} />
            {success || error ? (
              <div className={`rounded-xl border px-4 py-3 text-sm ${error ? "border-red-200 bg-red-50 text-red-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}>
                {error || success}
              </div>
            ) : null}
            <WishManagementPanel
              occasions={(categories.data ?? []) as import("@/lib/admin/types").CategoryRow[]}
              wishes={(wishes.data ?? []) as import("@/lib/admin/types").WishTemplateRow[]}
              links={(links.data ?? []) as import("@/lib/admin/types").WishTemplateOccasionRow[]}
            />
          </div>
        </PageContainer>
      </section>
    );
  }

  if (activeTab === "subscribers") {
    const result = await supabase
      .from("newsletter_subscribers")
      .select("id,email,topics,is_active,created_at,updated_at")
      .order("updated_at", { ascending: false });
    const allSubscribers =
      (result.data ?? []) as import("@/lib/admin/types").NewsletterSubscriberRow[];
    const subscribers = filterSubscribers(allSubscribers, {
      search: subscriberSearch,
      topic: subscriberTopic,
      status: subscriberStatus,
    });

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
            <SubscriberManagementPanel
              subscribers={subscribers}
              allSubscribers={allSubscribers}
              search={subscriberSearch}
              topic={subscriberTopic}
              status={subscriberStatus}
              error={result.error?.message ?? null}
            />
          </div>
        </PageContainer>
      </section>
    );
  }

  if (activeTab === "content") {
    const [siteContentResult, siteMediaResult] = await Promise.all([
      supabase
        .from("site_content")
        .select("key,value,label,section,sort_order,is_multiline")
        .order("section", { ascending: true })
        .order("sort_order", { ascending: true }),
      supabase
        .from("site_media")
        .select("key,label,section,sort_order,image_url,image_alt,updated_at")
        .order("section", { ascending: true })
        .order("sort_order", { ascending: true })
        .order("key", { ascending: true }),
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
            <SiteContentManagementPanel
              fields={
                (siteContentResult.data ?? []) as import("@/lib/content/site-content").SiteContentRow[]
              }
              error={siteContentResult.error?.message ?? null}
            />
            <SiteMediaManagementPanel
              rows={(siteMediaResult.data ?? []) as SiteMediaRow[]}
              error={siteMediaResult.error?.message ?? null}
            />
          </div>
        </PageContainer>
      </section>
    );
  }

  if (activeTab === "seo") {
    const [productsResult, categoriesResult] = await Promise.all([
      supabase
        .from("products")
        .select(
          "id,name,slug,meta_title,meta_description,og_title,og_description",
        )
        .order("name", { ascending: true }),
      supabase
        .from("categories")
        .select(
          "id,name,slug,category_type,meta_title,meta_description,og_title,og_description,robots_index",
        )
        .order("name", { ascending: true }),
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
            <SeoOverviewPanel
              products={
                (productsResult.data ?? []) as Array<
                  Pick<
                    ProductRow,
                    | "id"
                    | "name"
                    | "slug"
                    | "meta_title"
                    | "meta_description"
                    | "og_title"
                    | "og_description"
                  >
                >
              }
              categories={
                (categoriesResult.data ?? []) as Array<
                  Pick<
                    CategoryRow,
                    | "id"
                    | "name"
                    | "slug"
                    | "category_type"
                    | "meta_title"
                    | "meta_description"
                    | "og_title"
                    | "og_description"
                    | "robots_index"
                  >
                >
              }
              productsError={productsResult.error?.message ?? null}
              categoriesError={categoriesResult.error?.message ?? null}
            />
          </div>
        </PageContainer>
      </section>
    );
  }

  if (activeTab === "orders") {
    const ordersResult = await loadOrdersPage(supabase, ordersQuery);
    let notificationSummaries: Record<string, OrderNotificationSummary> = {};

    try {
      const deliveryRows = await loadOrderNotificationDeliveries(
        supabase,
        ordersResult.orders.map((order) => order.id),
      );
      notificationSummaries = buildOrderNotificationSummaries(deliveryRows);
    } catch (notificationError) {
      console.error("Failed to load order notification statuses", {
        error:
          notificationError instanceof Error
            ? notificationError.message
            : "unknown",
      });
    }

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
              total={ordersResult.total}
              query={ordersQuery}
              counts={ordersResult.counts}
              error={ordersResult.error}
              notificationSummaries={notificationSummaries}
            />
          </div>
        </PageContainer>
      </section>
    );
  }

  if (activeTab === "withdrawals") {
    const withdrawalsResult = await loadWithdrawalsPage(supabase, withdrawalsQuery);

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
            <WithdrawalsPanel
              requests={withdrawalsResult.requests}
              total={withdrawalsResult.total}
              query={withdrawalsQuery}
              error={withdrawalsResult.error}
            />
          </div>
        </PageContainer>
      </section>
    );
  }

  if (activeTab === "promotions") {
    const [productsResult, categoriesResult, productCategoriesResult, campaignsResult, couponsResult] =
      await Promise.all([
        supabase
          .from("products")
          .select("id,name,slug,price,image_url,is_sold_out")
          .order("name"),
        supabase.from("categories").select("id,name,category_type"),
        supabase.from("product_categories").select("product_id,category_id"),
        supabase
          .from("promotion_campaigns")
          .select(
            "id,name,discount_percentage,starts_at,ends_at,is_active,created_at,updated_at",
          )
          .order("created_at", { ascending: false }),
        supabase
          .from("discount_coupons")
          .select(
            "id,code,discount_percentage,is_active,used_at,used_order_id,expires_at,created_at,updated_at",
          )
          .order("created_at", { ascending: false }),
      ]);
    const promotionsResult = campaignsResult.error
      ? await supabase
          .from("product_promotions")
          .select(
            "id,product_id,name,discount_type,discount_value,starts_at,ends_at,is_active,created_at",
          )
          .order("created_at", { ascending: false })
      : await supabase
          .from("product_promotions")
          .select(
            "id,product_id,campaign_id,name,discount_type,discount_value,starts_at,ends_at,is_active,created_at",
          )
          .order("created_at", { ascending: false });

    const usedOrderIds = Array.from(
      new Set(
        (couponsResult.data ?? [])
          .map((coupon) =>
            typeof coupon.used_order_id === "string" ? coupon.used_order_id : null,
          )
          .filter((id): id is string => Boolean(id)),
      ),
    );
    const couponOrdersById: Record<
      string,
      import("@/components/admin/discount-coupon-panel").DiscountCouponOrderInfo
    > = {};
    if (usedOrderIds.length > 0) {
      const { data: usedOrders } = await supabase
        .from("orders")
        .select("id,customer_name,customer_email,customer_phone")
        .in("id", usedOrderIds);
      for (const order of usedOrders ?? []) {
        const id = String(order.id);
        couponOrdersById[id] = {
          id,
          shortId: id.slice(0, 8).toUpperCase(),
          customerName: String(order.customer_name ?? ""),
          customerEmail:
            typeof order.customer_email === "string" ? order.customer_email : null,
          customerPhone: String(order.customer_phone ?? ""),
        };
      }
    }

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
            <DiscountCouponPanel
              coupons={
                (couponsResult.data ?? []) as import("@/lib/admin/types").DiscountCouponRow[]
              }
              ordersById={couponOrdersById}
              loadError={couponsResult.error?.message ?? null}
            />
            {promotionsResult.error ? (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                Промоциите не могат да бъдат заредени. Изпълнете
                product_promotions.sql.
              </div>
            ) : (
              <PromotionManagementPanel
                products={buildPromotionProductOptions(
                  (productsResult.data ?? []).map((product) => ({
                    id: String(product.id),
                    name: String(product.name),
                    slug: String(product.slug ?? ""),
                    price: Number(product.price),
                    image_url: (product.image_url as string | null) ?? null,
                    is_sold_out: Boolean(product.is_sold_out),
                  })),
                  (categoriesResult.data ?? []).map((category) => ({
                    id: String(category.id),
                    name: String(category.name),
                    category_type: category.category_type,
                  })),
                  productCategoriesResult.data ?? [],
                )}
                categories={(categoriesResult.data ?? []).map((category) => ({
                  id: String(category.id),
                  name: String(category.name),
                  categoryType: category.category_type,
                }))}
                promotions={
                  (promotionsResult.data ?? []) as import("@/lib/product-pricing").ProductPromotionRow[]
                }
                campaigns={
                  (campaignsResult.data ?? []) as import("@/lib/product-pricing").PromotionCampaignRow[]
                }
                campaignError={campaignsResult.error?.message ?? null}
              />
            )}
          </div>
        </PageContainer>
      </section>
    );
  }

  if (activeTab === "colors") {
    const [groupsResult, optionsResult] = await Promise.all([
      supabase.from("color_groups").select("id,key,label").order("label"),
      supabase
        .from("color_options")
        .select("id,group_id,name,hex,sort_order,is_active")
        .order("sort_order"),
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
            {groupsResult.error || optionsResult.error ? (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                Цветовите палитри не могат да бъдат заредени. Изпълнете
                color_palette_management.sql.
              </div>
            ) : (
              <ColorManagementPanel
                groups={
                  (groupsResult.data ?? []) as import("@/lib/admin/types").ColorGroupRow[]
                }
                options={
                  (optionsResult.data ?? []) as import("@/lib/admin/types").ColorOptionRow[]
                }
              />
            )}
          </div>
        </PageContainer>
      </section>
    );
  }

  if (activeTab === "materials") {
    const { loadProductMaterials, loadProductVariantGroups } = await import(
      "@/lib/admin/variant-data"
    );
    const groupsLoaded = await loadProductVariantGroups(supabase);
    const materialsLoaded = await loadProductMaterials(supabase, groupsLoaded.groups);

    const loadError = materialsLoaded.error
      ? "Вариантите не могат да бъдат заредени. Изпълнете product_materials.sql и product_variant_groups.sql."
      : groupsLoaded.error
        ? "Групите варианти не могат да бъдат заредени напълно — показан е fallback за „Материал“."
        : null;

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
            <MaterialManagementPanel
              materials={materialsLoaded.materials}
              variantGroups={groupsLoaded.groups}
              loadError={loadError}
            />
          </div>
        </PageContainer>
      </section>
    );
  }

  if (activeTab === "blog" || activeTab === "events") {
    const table = activeTab === "blog" ? "blog_posts" : "events";
    const orderColumn = activeTab === "blog" ? "created_at" : "starts_at";
    const [
      result,
      categoriesResult,
      registrationsResult,
      galleryResult,
      productsResult,
      productCategoriesResult,
      blogPostProductsResult,
      blogCategoriesResult,
    ] =
      await Promise.all([
        supabase
          .from(table)
          .select("*")
          .order(orderColumn, { ascending: false, nullsFirst: false }),
        activeTab === "blog"
          ? supabase.from("categories").select("id,name,slug,category_type,parent_id,image_url,image_alt,cover_image_url,cover_image_alt,show_on_home,home_sort_order,card_description").order("name")
          : Promise.resolve({ data: [], error: null }),
        activeTab === "events"
          ? supabase
              .from("event_registrations")
              .select("*")
              .order("created_at", { ascending: false })
          : Promise.resolve({ data: [], error: null }),
        activeTab === "events"
          ? supabase
              .from("event_gallery_images")
              .select("id,image_url,alt_text,sort_order,is_published,created_at")
              .order("sort_order", { ascending: true })
              .order("created_at", { ascending: true })
          : Promise.resolve({ data: [], error: null }),
        activeTab === "blog"
          ? supabase
              .from("products")
              .select("id,name,slug,price,image_url,is_sold_out")
              .eq("status", "published")
              .eq("visibility", "public")
              .order("name")
          : Promise.resolve({ data: [], error: null }),
        activeTab === "blog"
          ? supabase.from("product_categories").select("product_id,category_id")
          : Promise.resolve({ data: [], error: null }),
        activeTab === "blog"
          ? supabase
              .from("blog_post_products")
              .select("blog_post_id,product_id,sort_order")
              .order("sort_order", { ascending: true })
          : Promise.resolve({ data: [], error: null }),
        activeTab === "blog"
          ? supabase
              .from("blog_categories")
              .select("id,name,slug,description,image_url,sort_order,is_active,created_at,updated_at")
              .order("sort_order", { ascending: true })
              .order("name", { ascending: true })
          : Promise.resolve({ data: [], error: null }),
      ]);
    const blogPostProductIdsByPostId = new Map<string, string[]>();
    for (const link of blogPostProductsResult.data ?? []) {
      const postId =
        typeof link.blog_post_id === "string" ? link.blog_post_id : "";
      const productId =
        typeof link.product_id === "string" ? link.product_id : "";
      if (!postId || !productId) {
        continue;
      }
      const ids = blogPostProductIdsByPostId.get(postId) ?? [];
      ids.push(productId);
      blogPostProductIdsByPostId.set(postId, ids);
    }
    const blogRecommendationProducts =
      activeTab === "blog"
        ? buildPromotionProductOptions(
            (productsResult.data ?? []) as Array<{
              id: string;
              name: string;
              slug: string;
              price: number;
              image_url: string | null;
              is_sold_out: boolean;
            }>,
            (categoriesResult.data ?? []) as Array<{
              id: string;
              name: string;
              category_type: import("@/lib/admin/types").CategoryType;
            }>,
            (productCategoriesResult.data ?? []) as Array<{
              product_id: string;
              category_id: string;
            }>,
          )
        : [];

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
              <>
                <BlogCategoryManagementPanel
                  categories={
                    (blogCategoriesResult.data ?? []) as import("@/lib/admin/types").BlogCategoryRow[]
                  }
                  error={blogCategoriesResult.error}
                />
                <ContentManagementPanel
                  kind="blog"
                  items={(result.data ?? []) as import("@/lib/admin/types").BlogPostRow[]}
                  categories={(categoriesResult.data ?? []) as import("@/lib/admin/types").CategoryRow[]}
                  blogCategories={
                    (blogCategoriesResult.data ?? []) as import("@/lib/admin/types").BlogCategoryRow[]
                  }
                  products={blogRecommendationProducts}
                  productIdsByPostId={blogPostProductIdsByPostId}
                  error={result.error}
                />
              </>
            ) : (
              <>
                <EventManagementPanel
                  items={(result.data ?? []) as import("@/lib/admin/types").EventRow[]}
                  error={result.error}
                />
                {galleryResult.error ? (
                  <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    Галерията не може да бъде заредена. Изпълнете
                    event_gallery_images.sql.
                  </div>
                ) : (
                  <EventGalleryManagementPanel
                    images={
                      (galleryResult.data ?? []) as import("@/lib/admin/types").EventGalleryImageRow[]
                    }
                  />
                )}
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

  if (activeTab === "categories") {
    const categoriesData = await loadAdminCategoriesData(supabase);
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
            {categoriesData.errors.categories ||
            categoriesData.errors.productCategories ||
            categoriesData.errors.categoryRelatedCategories ? (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                Категориите не могат да бъдат заредени напълно.
              </div>
            ) : null}
            <CategoryManagementPanel
              categories={categoriesData.categories}
              relatedCategoryIdsByCategoryId={
                categoriesData.relatedCategoryIdsByCategoryId
              }
              productCountByCategoryId={categoriesData.productCountByCategoryId}
              initialCategoryType={(() => {
                const categoryType = firstValue(params.categoryType);
                return categoryType === "material" ||
                  categoryType === "occasion" ||
                  categoryType === "product"
                  ? categoryType
                  : undefined;
              })()}
            />
          </div>
        </PageContainer>
      </section>
    );
  }

  if (activeTab === "products" && productsView !== "ordering") {
    const productsQuery = parseProductsQuery({
      q: firstValue(params.q),
      category: firstValue(params.category),
      status: firstValue(params.status),
      page: firstValue(params.page),
      pageSize: firstValue(params.page_size),
    });

    const [lookups, productsPage] = await Promise.all([
      loadAdminProductLookups(supabase),
      loadAdminProductsPage(supabase, productsQuery),
    ]);

    const editBundle =
      editProductId.length > 0
        ? await loadAdminProductEditBundle(supabase, editProductId, lookups)
        : null;

    return (
      <section className="pb-24 pt-10">
        <PageContainer>
          <div className="mx-auto max-w-6xl space-y-8">
            <AdminHeader activeTab={activeTab} />
            {success || error || editBundle?.error ? (
              <div
                className={`rounded-xl border px-4 py-3 text-sm ${
                  error || editBundle?.error
                    ? "border-red-200 bg-red-50 text-red-700"
                    : "border-emerald-200 bg-emerald-50 text-emerald-700"
                }`}
              >
                {error || editBundle?.error || success}
              </div>
            ) : null}
            <ProductCreatePanel
              categories={lookups.categories}
              colorGroups={lookups.colorGroups}
              colorOptions={lookups.colorOptions}
              materials={lookups.materials}
              variantGroups={lookups.variantGroups}
              wishes={lookups.wishTemplates}
              wishOccasionLinks={lookups.wishTemplateOccasions}
              faqProductGroups={lookups.faqProductGroups}
              faqItems={lookups.faqItems}
              draft={draft}
              imageReselectWarning={imageReselectWarning}
              successMessage={success}
            />
            <ProductListSlimPanel
              products={productsPage.products}
              total={productsPage.total}
              query={productsQuery}
              categories={lookups.categories}
              categoryById={
                new Map(lookups.categories.map((category) => [category.id, category]))
              }
              error={productsPage.error?.message ?? null}
              editProductId={editProductId || undefined}
            />
            {editBundle?.data ? (
              <ProductListPanel
                data={editBundle.data}
                editProductId={editProductId}
                editOnly
              />
            ) : null}
          </div>
        </PageContainer>
      </section>
    );
  }

  // Ordering still uses the monolith loader until Stage 4.
  const data = await loadAdminData(supabase);

  return (
    <section className="pb-24 pt-10">
      <PageContainer>
        <div className="mx-auto max-w-6xl space-y-8">
          <AdminHeader activeTab={activeTab} />
          <AdminNotices success={success} error={error} errors={data.errors} />
          <ProductOrderingPanel
            data={data}
            initialScope={orderingScope === "catalog" ? "catalog" : "home"}
          />
        </div>
      </PageContainer>
    </section>
  );
}
