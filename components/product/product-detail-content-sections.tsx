import { FaqSection } from "@/components/faq/faq-section";
import { ProductServiceBlocks } from "@/components/product/product-service-blocks";
import type { ProductServiceBlock } from "@/lib/content/product-page-copy";
import {
  getProductPageContentSections,
  hasProductPageContent,
  type ProductPageContentInput,
} from "@/lib/product-page-content-sections";
import { withPlainTextClass } from "@/lib/plain-text";
import type { FaqItem } from "@/lib/faq/types";

type ProductDetailContentSectionsProps = ProductPageContentInput;

type ProductDetailGalleryAsideProps = ProductDetailContentSectionsProps & {
  className?: string;
  faqItems?: FaqItem[];
  faqIdPrefix?: string;
  serviceBlocks?: ProductServiceBlock[];
  showFulfillmentInfo?: boolean;
};

const bodyClassName =
  "mt-2.5 text-base leading-7 text-boutique-muted md:leading-[1.75]";

function getSectionPreview(content: string) {
  const normalized = content.replace(/\s+/g, " ").trim();
  return normalized.length > 92 ? `${normalized.slice(0, 89)}...` : normalized;
}

function SectionIcon({ index }: { index: number }) {
  const paths = [
    "M12 3.5c2.2 2 4.5 4.7 4.5 7.7A4.5 4.5 0 0 1 12 15.7a4.5 4.5 0 0 1-4.5-4.5c0-3 2.3-5.7 4.5-7.7Zm0 12.2v4.8m-3 0h6",
    "M8 4.5h8m-8 0v15h8v-15m-10 4h12m-9 4h6m-6 4h6",
    "m6 6 12 12m0-12L6 18m2-10 2-2m6 2 2-2M8 16l-2 2m10-2 2 2",
    "M12 8v5l3 2m6-3a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z",
    "M5 10h14v10H5V10Zm2-4h10v4H7V6Zm3 7h4m-4 3h4",
  ];

  return (
    <svg
      aria-hidden="true"
      className="h-6 w-6 text-boutique-muted"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.7"
      viewBox="0 0 24 24"
    >
      <path d={paths[index % paths.length]} />
    </svg>
  );
}

export function ProductDetailContentSections(props: ProductDetailContentSectionsProps) {
  const sections = getProductPageContentSections(props);

  if (!sections.length) {
    return null;
  }

  return (
    <div className="w-full overflow-hidden rounded-2xl border border-boutique-line bg-white/75">
      {sections.map((section, index) => (
        <details
          key={section.id}
          className="group border-b border-boutique-line last:border-b-0"
          open={index === 0 ? false : undefined}
        >
          <summary className="grid cursor-pointer list-none grid-cols-[2rem_minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 marker:hidden">
            <SectionIcon index={index} />
            <span className="min-w-0">
              <span className="block text-sm font-semibold text-boutique-ink">
                {section.heading}
              </span>
              <span className="mt-0.5 block truncate text-xs leading-5 text-boutique-muted">
                {getSectionPreview(section.content)}
              </span>
            </span>
            <span
              aria-hidden="true"
              className="text-lg leading-none text-boutique-muted transition group-open:rotate-180"
            >
              ⌄
            </span>
          </summary>
          <div className={withPlainTextClass(`${bodyClassName} px-4 pb-4 pl-14 pt-0`)}>
            {section.content}
          </div>
        </details>
      ))}
    </div>
  );
}

export function ProductDetailFulfillmentInfo({
  serviceBlocks,
}: {
  serviceBlocks: ProductServiceBlock[];
}) {
  return <ProductServiceBlocks blocks={serviceBlocks} />;
}

export function ProductDetailGalleryAside({
  className,
  faqItems = [],
  faqIdPrefix,
  serviceBlocks = [],
  showFulfillmentInfo = true,
  ...props
}: ProductDetailGalleryAsideProps) {
  const hasContent = hasProductPageContent(props);
  const hasFaq = faqItems.length > 0;
  const showServiceBlocks = showFulfillmentInfo && serviceBlocks.length > 0;

  return (
    <aside
      aria-label="Подробна информация за продукта"
      className={`mt-6 w-full min-w-0 lg:mt-5${className ? ` ${className}` : ""}`}
    >
      {hasContent ? <ProductDetailContentSections {...props} /> : null}
      {showServiceBlocks ? (
        <div className={hasContent ? "mt-4" : undefined}>
          <ProductDetailFulfillmentInfo serviceBlocks={serviceBlocks} />
        </div>
      ) : null}
      {hasFaq ? (
        <FaqSection
          idPrefix={faqIdPrefix}
          items={faqItems}
          variant="product"
        />
      ) : null}
    </aside>
  );
}
