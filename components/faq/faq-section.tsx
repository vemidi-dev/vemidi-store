import { FaqAccordion } from "@/components/faq/faq-accordion";
import { PageContainer } from "@/components/layout/page-container";
import type { FaqItem } from "@/lib/faq/types";

const sectionTitle = "Често задавани въпроси";

type FaqSectionProps = {
  items: FaqItem[];
  variant: "home" | "product";
  idPrefix?: string;
};

export function FaqSection({ items, variant, idPrefix }: FaqSectionProps) {
  if (!items.length) {
    return null;
  }

  if (variant === "home") {
    return (
      <section
        aria-labelledby={`${idPrefix ?? "home-faq"}-heading`}
        className="border-b border-boutique-line bg-boutique-bg py-12 md:py-16"
      >
        <PageContainer className="md:max-w-3xl">
          <h2
            id={`${idPrefix ?? "home-faq"}-heading`}
            className="font-heading text-3xl tracking-tight text-boutique-ink md:text-4xl"
          >
            {sectionTitle}
          </h2>
          <FaqAccordion
            className="mt-6"
            idPrefix={idPrefix ?? "home-faq"}
            items={items}
          />
        </PageContainer>
      </section>
    );
  }

  return (
    <section
      aria-labelledby={`${idPrefix ?? "product-faq"}-heading`}
      className="mt-6 border-t border-boutique-line/70 pt-6"
    >
      <h2
        id={`${idPrefix ?? "product-faq"}-heading`}
        className="font-heading text-xl leading-snug text-boutique-ink md:text-[1.35rem]"
      >
        {sectionTitle}
      </h2>
      <FaqAccordion
        className="mt-2"
        idPrefix={idPrefix ?? "product-faq"}
        items={items}
      />
    </section>
  );
}
