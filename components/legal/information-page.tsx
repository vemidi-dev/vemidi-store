import type { ReactNode } from "react";

import { PageContainer } from "@/components/layout/page-container";
import { PageHero } from "@/components/ui/page-hero";

type InformationPageProps = {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
};

export function InformationPage({
  eyebrow,
  title,
  description,
  children,
}: InformationPageProps) {
  return (
    <div>
      <PageHero eyebrow={eyebrow} title={title} description={description} />
      <section className="pb-24 pt-8">
        <PageContainer>
          <article className="mx-auto max-w-3xl space-y-8 rounded-2xl border border-boutique-line bg-boutique-paper p-7 text-sm leading-7 text-boutique-muted shadow-boutique-sm md:p-10">
            {children}
          </article>
        </PageContainer>
      </section>
    </div>
  );
}

export function InformationSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section>
      <h2 className="font-heading text-2xl text-boutique-ink">{title}</h2>
      <div className="mt-3 space-y-3">{children}</div>
    </section>
  );
}
