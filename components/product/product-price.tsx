import { formatEur } from "@/lib/format-eur";
import { isProductOnPromotion } from "@/lib/product-pricing";
import type { Product } from "@/lib/catalog";

type ProductPriceProps = {
  product: Pick<Product, "price" | "compareAtPrice">;
  size?: "sm" | "md" | "lg";
  className?: string;
};

const sizeClasses = {
  sm: {
    current: "text-sm",
    compare: "text-xs",
  },
  md: {
    current: "text-lg",
    compare: "text-sm",
  },
  lg: {
    current: "text-3xl sm:text-4xl",
    compare: "text-lg",
  },
} as const;

export function ProductPrice({
  product,
  size = "md",
  className = "",
}: ProductPriceProps) {
  const onPromotion = isProductOnPromotion(product);
  const sizes = sizeClasses[size];

  return (
    <div className={`flex flex-wrap items-baseline gap-x-2 gap-y-1 ${className}`}>
      <p
        className={`font-heading tracking-tight text-boutique-sage-deep ${sizes.current} ${
          onPromotion ? "text-boutique-accent" : ""
        }`}
      >
        {formatEur(product.price)}
      </p>
      {onPromotion && product.compareAtPrice != null ? (
        <p
          className={`text-boutique-muted line-through decoration-boutique-muted/70 ${sizes.compare}`}
          aria-label={`Стара цена ${formatEur(product.compareAtPrice)}`}
        >
          {formatEur(product.compareAtPrice)}
        </p>
      ) : null}
    </div>
  );
}
