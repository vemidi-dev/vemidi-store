import {
  PRODUCT_PUBLICATION_STATUS_LABELS,
  type ProductPublicationStatus,
} from "@/lib/product-publication";

const badgeClassByStatus: Record<ProductPublicationStatus, string> = {
  draft:
    "inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-900",
  published:
    "inline-flex rounded-full bg-boutique-sage/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-boutique-sage-deep",
  archived:
    "inline-flex rounded-full bg-boutique-bg px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-boutique-muted",
};

type ProductPublicationBadgeProps = {
  status: ProductPublicationStatus;
};

export function ProductPublicationBadge({ status }: ProductPublicationBadgeProps) {
  return (
    <span className={badgeClassByStatus[status]} title={PRODUCT_PUBLICATION_STATUS_LABELS[status]}>
      {PRODUCT_PUBLICATION_STATUS_LABELS[status]}
    </span>
  );
}
