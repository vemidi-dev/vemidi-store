import Link from "next/link";

import {
  getProductPageContentSections,
  hasProductPageContent,
  type ProductPageContentInput,
} from "@/lib/product-page-content-sections";
import { withPlainTextClass } from "@/lib/plain-text";

type ProductDetailContentSectionsProps = ProductPageContentInput;

const bodyClassName =
  "mt-2.5 text-base leading-7 text-boutique-muted md:leading-[1.75]";

export function ProductDetailContentSections(props: ProductDetailContentSectionsProps) {
  const sections = getProductPageContentSections(props);

  if (!sections.length) {
    return null;
  }

  return (
    <div className="flex w-full flex-col gap-6">
      {sections.map((section, index) => (
        <section
          key={section.id}
          aria-labelledby={`product-${section.id}-heading`}
          className={index > 0 ? "border-t border-boutique-line/70 pt-6" : undefined}
        >
          <h2
            id={`product-${section.id}-heading`}
            className="font-heading text-xl leading-snug text-boutique-ink md:text-[1.35rem]"
          >
            {section.heading}
          </h2>
          <div className={withPlainTextClass(bodyClassName)}>{section.content}</div>
        </section>
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
            Виж условията
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
  ...props
}: ProductDetailContentSectionsProps & { className?: string }) {
  const hasContent = hasProductPageContent(props);

  return (
    <aside
      aria-label="Подробна информация за продукта"
      className={`mt-6 w-full min-w-0 lg:mt-5${className ? ` ${className}` : ""}`}
    >
      {hasContent ? <ProductDetailContentSections {...props} /> : null}
      <div
        className={
          hasContent
            ? "mt-6 border-t border-boutique-line/70 pt-6"
            : undefined
        }
      >
        <ProductDetailFulfillmentInfo />
      </div>
    </aside>
  );
}
