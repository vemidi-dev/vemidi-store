import Link from "next/link";

import type {
  ProductServiceBlock,
  ProductServiceBlockIcon,
} from "@/lib/content/product-page-copy";

type ProductServiceBlocksProps = {
  blocks: ProductServiceBlock[];
  className?: string;
};

const ICON_PATHS: Record<ProductServiceBlockIcon, string> = {
  clock: "M12 8v5l3 2m6-3a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z",
  truck:
    "M3 7h11v8H3V7Zm11 2h3l2 3v3h-5V9ZM7 17a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Zm9 0a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z",
  return: "m6 6 12 12m0-12L6 18m2-10 2-2m6 2 2-2M8 16l-2 2m10-2 2 2",
  shield:
    "M12 3.5 5 6.2V11c0 4.1 2.9 7.9 7 9.5 4.1-1.6 7-5.4 7-9.5V6.2L12 3.5Z",
  package:
    "M4 8.5 12 4l8 4.5M4 8.5v7L12 20l8-4.5v-7M12 4v16M4 8.5l8 4.5 8-4.5",
};

function ServiceBlockIcon({ icon }: { icon: ProductServiceBlockIcon }) {
  return (
    <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-boutique-line bg-boutique-bg text-boutique-sage-deep">
      <svg
        aria-hidden="true"
        className="h-5 w-5"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.7"
        viewBox="0 0 24 24"
      >
        <path d={ICON_PATHS[icon]} />
      </svg>
    </span>
  );
}

export function ProductServiceBlocks({
  blocks,
  className,
}: ProductServiceBlocksProps) {
  if (!blocks.length) {
    return null;
  }

  return (
    <section
      aria-label="Информация за изработка, доставка и връщане"
      className={`grid gap-4 sm:grid-cols-3${className ? ` ${className}` : ""}`}
    >
      {blocks.map((block) => (
        <article
          key={block.id}
          className="rounded-2xl border border-boutique-line bg-white/80 p-4 shadow-boutique-sm"
        >
          <div className="flex items-start gap-3">
            <ServiceBlockIcon icon={block.icon} />
            <div className="min-w-0">
              {block.title ? (
                <h2 className="text-sm font-semibold text-boutique-ink">
                  {block.title}
                </h2>
              ) : null}
              {block.text ? (
                <p className="mt-1.5 text-sm leading-6 text-boutique-muted">
                  {block.text}
                  {block.linkLabel && block.linkHref ? (
                    <>
                      {" "}
                      <Link
                        href={block.linkHref}
                        className="font-semibold text-boutique-sage-deep underline-offset-4 hover:underline"
                      >
                        {block.linkLabel}
                      </Link>
                      .
                    </>
                  ) : null}
                </p>
              ) : null}
            </div>
          </div>
        </article>
      ))}
    </section>
  );
}
