import { ContentImage } from "@/components/content/content-image";
import { PageContainer } from "@/components/layout/page-container";
import { withPlainTextClass } from "@/lib/plain-text";
import type { ReactNode } from "react";

export function ContentDetail({
  eyebrow,
  title,
  excerpt,
  content,
  imageUrl,
  meta,
  children,
}: {
  eyebrow: string;
  title: string;
  excerpt: string;
  content: string;
  imageUrl: string | null;
  meta?: string[];
  children?: ReactNode;
}) {
  return (
    <article>
      <header className="border-b border-boutique-line bg-boutique-paper">
        <PageContainer className="py-14 text-center md:py-20">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-boutique-accent">{eyebrow}</p>
          <h1 className="mx-auto mt-5 max-w-4xl font-heading text-4xl leading-tight text-boutique-ink sm:text-5xl">{title}</h1>
          <p className={withPlainTextClass("mx-auto mt-5 max-w-2xl text-base leading-relaxed text-boutique-muted")}>
            {excerpt}
          </p>
          {meta?.length ? (
            <div className="mt-5 flex flex-wrap justify-center gap-x-5 gap-y-2 text-sm text-boutique-muted">
              {meta.map((item) => <span key={item}>{item}</span>)}
            </div>
          ) : null}
        </PageContainer>
      </header>
      <PageContainer className="py-10 md:py-14">
        <div className="mx-auto aspect-[16/9] max-w-4xl overflow-hidden rounded-3xl border border-boutique-line shadow-boutique-sm">
          <ContentImage src={imageUrl} alt={title} label="Снимка към съдържанието" />
        </div>
        <div className="mx-auto mt-10 max-w-3xl">
          {content ? (
            <div className={withPlainTextClass("text-base leading-8 text-boutique-muted")}>
              {content}
            </div>
          ) : null}
          {children ? <div className={`space-y-6 ${content ? "mt-6" : ""}`}>{children}</div> : null}
        </div>
      </PageContainer>
    </article>
  );
}
