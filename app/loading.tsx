import { PageContainer } from "@/components/layout/page-container";

export default function Loading() {
  return (
    <div aria-busy="true" aria-live="polite">
      <span className="sr-only">Страницата се зарежда</span>
      <section className="border-b border-boutique-line bg-boutique-paper">
        <PageContainer className="py-14 md:py-20">
          <div className="mx-auto h-3 w-28 animate-pulse rounded bg-boutique-line" />
          <div className="mx-auto mt-6 h-12 max-w-xl animate-pulse rounded-xl bg-boutique-line/80" />
          <div className="mx-auto mt-5 h-5 max-w-2xl animate-pulse rounded bg-boutique-line/60" />
        </PageContainer>
      </section>
      <PageContainer className="grid gap-6 py-12 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2].map((item) => (
          <div
            key={item}
            className="aspect-[4/5] animate-pulse rounded-3xl border border-boutique-line bg-boutique-paper"
            aria-hidden
          />
        ))}
      </PageContainer>
    </div>
  );
}
