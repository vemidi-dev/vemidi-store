"use client";

import { useState } from "react";

import { useCart } from "@/components/cart/cart-provider";
import type { Product } from "@/lib/catalog";

type AddToCartButtonProps = {
  product: Product;
};

export function AddToCartButton({ product }: AddToCartButtonProps) {
  const { addProduct } = useCart();
  const [added, setAdded] = useState(false);

  return (
    <button
      type="button"
      onClick={() => {
        addProduct(product, 1);
        setAdded(true);
        setTimeout(() => setAdded(false), 1600);
      }}
      className="rounded-full bg-boutique-ink px-10 py-3.5 text-xs font-semibold uppercase tracking-[0.2em] text-boutique-paper transition hover:bg-boutique-accent"
    >
      {added ? "Added · thank you" : "Add to cart"}
    </button>
  );
}
