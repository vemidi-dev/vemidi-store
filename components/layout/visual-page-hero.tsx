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
  descriptionAs?: "p" | "h2";
};

const descriptionClassName =
  "mx-auto mt-4 max-w-md text-sm font-normal leading-6 text-boutique-muted sm:mt-5 sm:text-base sm:leading-7";

export function VisualPageHero({
  title,
  description,
  imageSrc,
  imageAlt,
  eyebrow,
  imagePosition = "center",
  descriptionAs = "p",
}: VisualPageHeroProps) {
  return (
    <section className="overflow-hidden border-b border-boutique-line bg-boutique-paper">
      <div className="grid lg:min-h-[32rem] lg:grid-cols-[0.78fr_1.22fr] lg:items-stretch xl:min-h-[34rem]">
        <div className="relative order-1 min-h-[17rem] overflow-hidden sm:min-h-[22rem] lg:order-2 lg:min-h-full">
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

        <div className="order-2 flex min-w-0 items-center bg-[linear-gradient(135deg,#fdfcfa_0%,#ebe4db_100%)] lg:order-1 lg:min-h-full">
          <PageContainer className="w-full py-8 sm:py-12 lg:py-10 xl:py-12">
            <div className="mx-auto flex w-full max-w-md flex-col justify-center text-center">
              {eyebrow ? (
                <div className="text-balance text-xs font-semibold uppercase tracking-[0.18em] text-boutique-sage-deep">
                  {eyebrow}
                </div>
              ) : null}
              <h1
                className={`text-balance font-heading text-[clamp(1.75rem,3.2vw+1rem,3.75rem)] leading-[1.06] tracking-tight text-boutique-ink ${
                  eyebrow ? "mt-4" : ""
                }`}
              >
                {title}
              </h1>
              {descriptionAs === "h2" ? (
                <h2 className={descriptionClassName}>{description}</h2>
              ) : (
                <p className={descriptionClassName}>{description}</p>
              )}
              <div className="mx-auto mt-5 flex w-24 shrink-0 items-center gap-3 text-boutique-sage-deep sm:mt-6">
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
