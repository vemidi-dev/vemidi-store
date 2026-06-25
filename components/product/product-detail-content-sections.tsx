import Link from "next/link";

import { PageContainer } from "@/components/layout/page-container";
import {
  getProductPageContentSections,
  hasProductPageContent,
  type ProductPageContentInput,
} from "@/lib/product-page-content-sections";
import { withPlainTextClass } from "@/lib/plain-text";

type ProductDetailContentSectionsProps = ProductPageContentInput;

const bodyClassName =
  "mt-3 text-base leading-8 text-boutique-muted md:text-lg md:leading-[1.8]";

export function ProductDetailContentSections(props: ProductDetailContentSectionsProps) {
  const sections = getProductPageContentSections(props);

  if (!sections.length) {
    return null;
  }

  const useTwoColumns = sections.length >= 3;

  return (
    <div
      className={
        useTwoColumns
          ? "mx-auto grid w-full max-w-5xl gap-8 md:gap-10 lg:grid-cols-2 lg:gap-x-12 lg:gap-y-10"
          : "mx-auto flex w-full max-w-3xl flex-col gap-8 md:gap-10"
      }
    >
      {sections.map((section) => (
        <section key={section.id} aria-labelledby={`product-${section.id}-heading`}>
          <h2
            id={`product-${section.id}-heading`}
            className="font-heading text-2xl text-boutique-ink md:text-[1.75rem]"
          >
            {section.heading}
          </h2>
          <div className={withPlainTextClass(bodyClassName)}>{section.content}</div>
        </section>
      ))}
    </div>
  );
}

export function ProductDetailFulfillmentInfo({
  className = "mx-auto mt-10 w-full max-w-5xl lg:mt-12",
}: {
  className?: string;
}) {
  return (
    <div className={className}>
      <div className="divide-y divide-boutique-line rounded-2xl border border-boutique-line bg-boutique-bg/70 text-sm shadow-sm md:grid md:grid-cols-3 md:divide-x md:divide-y-0">
        <div className="px-5 py-4">
          <p className="font-semibold text-boutique-ink">Изработка</p>
          <p className="leading-6 text-boutique-muted">
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
        <div className="px-5 py-4">
          <p className="font-semibold text-boutique-ink">Доставка</p>
          <p className="leading-6 text-boutique-muted">
            Еконт или Спиди · наложен платеж.
            <Link
              href="/delivery"
              className="ml-1 font-semibold text-boutique-sage-deep underline-offset-4 hover:underline"
            >
              Виж условията
            </Link>
          </p>
        </div>
        <div className="px-5 py-4">
          <p className="font-semibold text-boutique-ink">Връщане</p>
          <p className="leading-6 text-boutique-muted">
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
    </div>
  );
}

export function ProductDetailInfoZone(props: ProductDetailContentSectionsProps) {
  const hasContent = hasProductPageContent(props);

  return (
    <section className="border-t border-boutique-line bg-boutique-bg">
      <PageContainer className="py-8 md:py-10">
        {hasContent ? <ProductDetailContentSections {...props} /> : null}
        <ProductDetailFulfillmentInfo
          className={
            hasContent
              ? "mx-auto mt-10 w-full max-w-5xl lg:mt-12"
              : "mx-auto w-full max-w-5xl"
          }
        />
      </PageContainer>
    </section>
  );
}
