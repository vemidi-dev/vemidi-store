import Link from "next/link";

import { PageContainer } from "@/components/layout/page-container";
import { withPlainTextClass } from "@/lib/plain-text";

type ProductDetailContentSectionsProps = {
  description?: string | null;
  additionalInfo?: string | null;
};

const bodyClassName =
  "mt-4 text-base leading-8 text-boutique-muted md:text-lg md:leading-[1.8]";

export function ProductDetailContentSections({
  description,
  additionalInfo,
}: ProductDetailContentSectionsProps) {
  const trimmedDescription = description?.trim() ?? "";
  const trimmedAdditionalInfo = additionalInfo?.trim() ?? "";

  if (!trimmedDescription && !trimmedAdditionalInfo) {
    return null;
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-10 md:gap-12">
      {trimmedDescription ? (
        <section aria-labelledby="product-about-heading">
          <h2
            id="product-about-heading"
            className="font-heading text-2xl text-boutique-ink md:text-3xl"
          >
            За продукта
          </h2>
          <div className={withPlainTextClass(bodyClassName)}>{trimmedDescription}</div>
        </section>
      ) : null}

      {trimmedAdditionalInfo ? (
        <section aria-labelledby="product-additional-info-heading">
          <h2
            id="product-additional-info-heading"
            className="font-heading text-2xl text-boutique-ink md:text-3xl"
          >
            Допълнителна информация
          </h2>
          <div className={withPlainTextClass(bodyClassName)}>{trimmedAdditionalInfo}</div>
        </section>
      ) : null}
    </div>
  );
}

export function ProductDetailFulfillmentInfo() {
  return (
    <div className="mx-auto mt-10 w-full max-w-5xl lg:mt-12">
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

export function ProductDetailInfoZone({
  description,
  additionalInfo,
}: ProductDetailContentSectionsProps) {
  const hasContent =
    Boolean(description?.trim()) || Boolean(additionalInfo?.trim());

  return (
    <section className="border-t border-boutique-line bg-boutique-bg">
      <PageContainer className="py-10 md:py-14">
        {hasContent ? (
          <ProductDetailContentSections
            description={description}
            additionalInfo={additionalInfo}
          />
        ) : null}
        <ProductDetailFulfillmentInfo />
      </PageContainer>
    </section>
  );
}
