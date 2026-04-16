import { PageContainer } from "@/components/layout/page-container";

type PageHeroProps = {
  eyebrow: string;
  title: string;
  description: string;
};

export function PageHero({ eyebrow, title, description }: PageHeroProps) {
  return (
    <section className="border-b border-boutique-line bg-boutique-paper">
      <PageContainer className="py-14 text-center md:py-20">
        <p className="text-[0.7rem] font-semibold uppercase tracking-[0.28em] text-boutique-accent">
          {eyebrow}
        </p>
        <h1 className="font-heading mt-5 text-4xl leading-tight tracking-tight text-boutique-ink sm:text-5xl">
          {title}
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-boutique-muted">
          {description}
        </p>
      </PageContainer>
    </section>
  );
}
