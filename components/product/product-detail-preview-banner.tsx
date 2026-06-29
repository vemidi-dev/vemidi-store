import type { ProductPublicationStatus } from "@/lib/product-publication";
import { PRODUCT_PUBLICATION_STATUS_LABELS } from "@/lib/product-publication";

type ProductDetailPreviewBannerProps = {
  status: ProductPublicationStatus;
};

export function ProductDetailPreviewBanner({
  status,
}: ProductDetailPreviewBannerProps) {
  const isPublic = status === "published";
  const headline = isPublic
    ? "Преглед — публикуван продукт"
    : "Преглед — продуктът не е публичен";
  const detail = isPublic
    ? "Това е администраторски преглед. Публичната страница е достъпна в магазина."
    : `Статус: ${PRODUCT_PUBLICATION_STATUS_LABELS[status]}. Публичният URL връща 404, докато продуктът не бъде публикуван.`;

  return (
    <div
      role="status"
      className="border-b border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950"
    >
      <div className="mx-auto flex max-w-6xl flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-semibold">{headline}</p>
          <p className="mt-0.5 text-amber-900">{detail}</p>
        </div>
        <a
          href="/admin?tab=products"
          className="inline-flex w-fit shrink-0 rounded-full border border-amber-300 bg-white px-4 py-1.5 text-xs font-semibold text-amber-950 transition hover:border-amber-400"
        >
          Обратно към админ
        </a>
      </div>
    </div>
  );
}
