import { PageContainer } from "@/components/layout/page-container";

type PageHeroProps = {
  eyebrow: string;
  title: string;
  description: string;
  compact?: boolean;
};

export function PageHero({
  eyebrow,
  title,
  description,
  compact = false,
}: PageHeroProps) {
  return (
    <section className="border-b border-boutique-line bg-boutique-paper">
      <PageContainer
        className={`${compact ? "py-8 md:py-12" : "py-14 md:py-20"} text-center`}
      >
        <p className="text-[0.7rem] font-semibold uppercase tracking-[0.28em] text-boutique-accent">
          {eyebrow}
        </p>
        <h1
          className={`font-heading leading-tight tracking-tight text-boutique-ink ${
            compact ? "mt-3 text-3xl sm:text-4xl" : "mt-5 text-4xl sm:text-5xl"
          }`}
        >
          {title}
        </h1>
        <p
          className={`mx-auto max-w-2xl leading-relaxed text-boutique-muted ${
            compact ? "mt-3 text-sm" : "mt-5 text-base"
          }`}
        >
          {description}
        </p>
      </PageContainer>
    </section>
  );
}
