import Link from "next/link";

import { FaqSection } from "@/components/faq/faq-section";
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
};

const bodyClassName =
  "mt-2.5 text-base leading-7 text-boutique-muted md:leading-[1.75]";

export function ProductDetailContentSections(props: ProductDetailContentSectionsProps) {
  const sections = getProductPageContentSections(props);

  if (!sections.length) {
    return null;
  }

  return (
    <div className="flex w-full flex-col gap-3">
      {sections.map((section, index) => (
        <details
          key={section.id}
          className="group rounded-xl border border-boutique-line bg-boutique-paper/75 px-4 py-3"
          open={index === 0 ? false : undefined}
        >
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-semibold text-boutique-ink marker:hidden">
            {section.heading}
            <span
              aria-hidden="true"
              className="text-lg leading-none text-boutique-muted transition group-open:rotate-180"
            >
              ⌄
            </span>
          </summary>
          <div className={withPlainTextClass(bodyClassName)}>{section.content}</div>
        </details>
      ))}
    </div>
  );
}

export function ProductDetailFulfillmentInfo() {
  return (
    <div className="flex flex-col gap-5 text-sm">
      <div>
        <p className="font-semibold text-boutique-ink">Изработка</p>
        <p className="mt-1.5 leading-6 text-boutique-muted">
          1–5 работни дни в зависимост от натоварването. Ако ви е нужен друг срок,
          <Link
            href="/kontakti"
            className="ml-1 font-semibold text-boutique-sage-deep underline-offset-4 hover:underline"
          >
            свържете се с нас
          </Link>
          .
        </p>
      </div>
      <div className="border-t border-boutique-line/70 pt-5">
        <p className="font-semibold text-boutique-ink">Доставка</p>
        <p className="mt-1.5 leading-6 text-boutique-muted">
          Еконт или Спиди · наложен платеж.
          <Link
            href="/delivery"
            className="ml-1 font-semibold text-boutique-sage-deep underline-offset-4 hover:underline"
          >
            Вижте условията
          </Link>
        </p>
      </div>
      <div className="border-t border-boutique-line/70 pt-5">
        <p className="font-semibold text-boutique-ink">Връщане</p>
        <p className="mt-1.5 leading-6 text-boutique-muted">
          14 дни за неперсонализирани продукти.
          <Link
            href="/returns"
            className="ml-1 font-semibold text-boutique-sage-deep underline-offset-4 hover:underline"
          >
            Условия за връщане
          </Link>
        </p>
      </div>
    </div>
  );
}

export function ProductDetailGalleryAside({
  className,
  faqItems = [],
  faqIdPrefix,
  ...props
}: ProductDetailGalleryAsideProps) {
  const hasContent = hasProductPageContent(props);
  const hasFaq = faqItems.length > 0;

  return (
    <aside
      aria-label="Подробна информация за продукта"
      className={`mt-6 w-full min-w-0 lg:mt-5${className ? ` ${className}` : ""}`}
    >
      {hasContent ? <ProductDetailContentSections {...props} /> : null}
      <div
        className={
          hasContent
            ? "mt-4 border-t border-boutique-line/70 pt-4"
            : undefined
        }
      >
        <ProductDetailFulfillmentInfo />
      </div>
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
