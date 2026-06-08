import Link from "next/link";

import { PageContainer } from "@/components/layout/page-container";
import { siteConfig } from "@/config/site";

export function Footer() {
  return (
    <footer className="mt-auto border-t border-boutique-sage-deep/30 bg-boutique-sage-deep text-boutique-on-sage">
      <PageContainer className="grid gap-12 py-14 md:grid-cols-[1.4fr_1fr] md:py-16">
        <div className="space-y-4">
          <p className="font-heading text-2xl text-boutique-paper">{siteConfig.name}</p>
          <p className="max-w-md text-sm leading-relaxed text-boutique-on-sage/85">
            Small-batch laser-cut and engraved pieces for weddings, milestones, and quiet luxury at
            home. Made to order with care.
          </p>
        </div>

        <div className="space-y-4">
          <p className="text-[0.7rem] font-semibold uppercase tracking-[0.25em] text-boutique-on-sage/55">
            Explore
          </p>
          <div className="flex flex-col gap-3">
            {siteConfig.footerLinks.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-sm text-boutique-on-sage/90 transition hover:text-boutique-on-sage"
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      </PageContainer>

      <div className="border-t border-white/10">
        <PageContainer className="py-5 text-center text-xs text-boutique-on-sage/50">
          © {new Date().getFullYear()} {siteConfig.name}. Crafted with care.
        </PageContainer>
      </div>
    </footer>
  );
}
