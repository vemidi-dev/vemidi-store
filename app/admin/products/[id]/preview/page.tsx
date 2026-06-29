import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { ProductDetailPreviewBanner } from "@/components/product/product-detail-preview-banner";
import { ProductDetailView } from "@/components/product/product-detail-view";
import { filterStorefrontVisibleCategories } from "@/lib/category-visibility";
import { getProductFaqItems } from "@/lib/faq/repository";
import { getPrimaryActiveProductLandingPage } from "@/lib/product-landing/repository";
import {
  normalizeProductPublicationStatus,
  type ProductPublicationStatus,
} from "@/lib/product-publication";
import {
  getProductCategorySlugs,
  isProductCategoryIndexable,
} from "@/lib/seo/category-indexability";
import { resolveProductPageSeo } from "@/lib/seo/product-page-seo";
import { checkIsAdmin } from "@/lib/supabase/admin-auth";
import { createClient } from "@/lib/supabase/server";
import {
  getStorefrontCatalog,
  loadAdminProductPreviewDetails,
} from "@/lib/storefront/repository";

export const runtime = "nodejs";

type AdminProductPreviewPageProps = {
  params: Promise<{ id: string }>;
};

async function requireAdminPreviewAccess(): Promise<
  NonNullable<Awaited<ReturnType<typeof createClient>>>
> {
  const supabase = await createClient();
  if (!supabase) {
    redirect(
      `/admin/login?message=${encodeURIComponent("Supabase не е конфигуриран.")}`,
    );
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(
      `/admin/login?message=${encodeURIComponent("Моля, влезте като администратор.")}`,
    );
  }

  const { isAdmin, error } = await checkIsAdmin(supabase, user.id);
  if (error || !isAdmin) {
    redirect(
      `/admin/login?message=${encodeURIComponent("Нямате достъп до администраторския преглед.")}`,
    );
  }

  return supabase;
}

export async function generateMetadata({
  params,
}: AdminProductPreviewPageProps): Promise<Metadata> {
  const { id } = await params;
  const supabase = await requireAdminPreviewAccess();
  const product = await loadAdminProductPreviewDetails(supabase, id);

  if (!product) {
    return {
      title: "Преглед на продукт",
      robots: { index: false, follow: false },
    };
  }

  return {
    title: `Преглед: ${product.title}`,
    robots: { index: false, follow: false },
  };
}

export default async function AdminProductPreviewPage({
  params,
}: AdminProductPreviewPageProps) {
  const { id } = await params;
  const supabase = await requireAdminPreviewAccess();
  const product = await loadAdminProductPreviewDetails(supabase, id);

  if (!product) {
    notFound();
  }

  const { data: statusRow } = await supabase
    .from("products")
    .select("status")
    .eq("id", id)
    .maybeSingle();
  const publicationStatus: ProductPublicationStatus = normalizeProductPublicationStatus(
    statusRow?.status,
    "draft",
  );

  const [primaryLandingPage, productFaqItems, catalog] = await Promise.all([
    getPrimaryActiveProductLandingPage(supabase, product.id),
    getProductFaqItems(product.id, supabase),
    getStorefrontCatalog(),
  ]);

  const productById = new Map(
    catalog.products.map((catalogProduct) => [catalogProduct.id, catalogProduct]),
  );
  const relatedProducts = (
    catalog.relatedProductIdsByProductId.get(product.id) ?? []
  )
    .map((productId) => productById.get(productId))
    .filter(
      (related): related is (typeof catalog.products)[number] => Boolean(related),
    )
    .slice(0, 4);

  const {
    primaryCategory,
    breadcrumbItems,
    seoContext: productSeoContext,
    categorySlugs: productCategorySlugsFromCatalog,
  } = resolveProductPageSeo(catalog, product);
  const productCategorySlugs = getProductCategorySlugs(catalog.products);
  const showCategoryLink =
    primaryCategory &&
    isProductCategoryIndexable(
      catalog.categories,
      productCategorySlugs,
      primaryCategory,
    );
  const productOccasionSlugs = new Set(productCategorySlugsFromCatalog);
  const productOccasions = filterStorefrontVisibleCategories(catalog.categories)
    .filter(
      (category) =>
        category.category_type === "occasion" &&
        productOccasionSlugs.has(category.slug),
    )
    .sort((left, right) => left.name.localeCompare(right.name, "bg"));

  return (
    <ProductDetailView
      product={product}
      breadcrumbItems={breadcrumbItems}
      productOccasions={productOccasions}
      primaryCategory={primaryCategory}
      showCategoryLink={Boolean(showCategoryLink)}
      relatedProducts={relatedProducts}
      primaryLandingPage={primaryLandingPage}
      productFaqItems={productFaqItems}
      productSeoContext={productSeoContext}
      includeStructuredData={false}
      previewBanner={<ProductDetailPreviewBanner status={publicationStatus} />}
    />
  );
}