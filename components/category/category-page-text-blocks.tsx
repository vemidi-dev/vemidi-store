import { PageContainer } from "@/components/layout/page-container";
import { withPlainTextClass } from "@/lib/plain-text";

export function CategoryIntroSection({ text }: { text: string }) {
  return (
    <section className="border-b border-boutique-line bg-boutique-paper py-8 md:py-10">
      <PageContainer>
        <p
          className={withPlainTextClass(
            "mx-auto max-w-3xl text-base leading-8 text-boutique-muted",
          )}
        >
          {text}
        </p>
      </PageContainer>
    </section>
  );
}

export function CategorySeoBodySection({ text }: { text: string }) {
  return (
    <section className="border-t border-boutique-line bg-boutique-paper py-10 md:py-14">
      <PageContainer>
        <div
          className={withPlainTextClass(
            "mx-auto max-w-3xl text-base leading-8 text-boutique-muted",
          )}
        >
          {text}
        </div>
      </PageContainer>
    </section>
  );
}
