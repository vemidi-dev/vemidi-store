import Image from "next/image";
import type { ReactNode } from "react";

import { PageContainer } from "@/components/layout/page-container";

type VisualPageHeroProps = {
  title: string;
  description: string;
  imageSrc: string;
  imageAlt: string;
  eyebrow?: ReactNode;
  imagePosition?: string;
};

export function VisualPageHero({
  title,
  description,
  imageSrc,
  imageAlt,
  eyebrow,
  imagePosition = "center",
}: VisualPageHeroProps) {
  return (
    <section className="overflow-hidden border-b border-boutique-line bg-boutique-paper">
      <div className="grid lg:min-h-[20rem] lg:grid-cols-[0.78fr_1.22fr]">
        <div className="relative order-1 min-h-48 overflow-hidden sm:min-h-72 lg:order-2 lg:min-h-full">
          <Image
            src={imageSrc}
            alt={imageAlt}
            fill
            priority
            sizes="(max-width: 1024px) 100vw, 61vw"
            className="object-cover"
            style={{ objectPosition: imagePosition }}
          />
        </div>

        <div className="order-2 flex items-center bg-[linear-gradient(135deg,#fdfcfa_0%,#ebe4db_100%)] lg:order-1">
          <PageContainer className="py-8 sm:py-12 lg:py-14">
            <div className="mx-auto max-w-md text-center">
              {eyebrow ? (
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-boutique-sage-deep">
                  {eyebrow}
                </div>
              ) : null}
              <h1
                className={`font-heading text-4xl leading-[0.95] tracking-tight text-boutique-ink sm:text-6xl ${
                  eyebrow ? "mt-4" : ""
                }`}
              >
                {title}
              </h1>
              <p className="mx-auto mt-4 max-w-md text-sm leading-6 text-boutique-muted sm:mt-5 sm:text-base sm:leading-7">
                {description}
              </p>
              <div className="mx-auto mt-5 flex w-24 items-center gap-3 text-boutique-sage-deep sm:mt-6">
                <span className="h-px flex-1 bg-boutique-sage/45" />
                <span aria-hidden className="text-sm">
                  ♡
                </span>
                <span className="h-px flex-1 bg-boutique-sage/45" />
              </div>
            </div>
          </PageContainer>
        </div>
      </div>
    </section>
  );
}
