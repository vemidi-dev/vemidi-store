"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import type { Product } from "@/lib/catalog";
import { makeCartLineId } from "@/lib/cart-line-id";
import {
  getCartTotals,
  normalizeCartQuantity,
  normalizePersonalization,
  parseStoredCart,
} from "@/lib/cart-storage";
import { CART_STORAGE_KEY, type CartLine } from "@/lib/cart-types";
import type { SelectedProductColor } from "@/lib/product-colors";

type CartContextValue = {
  lines: CartLine[];
  itemCount: number;
  subtotal: number;
  addProduct: (
    product: Product,
    quantity?: number,
    personalization?: string,
    selectedColors?: SelectedProductColor[],
  ) => void;
  setQuantity: (lineId: string, quantity: number) => void;
  removeLine: (lineId: string) => void;
  clear: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);

function readStoredLines(): CartLine[] {
  if (typeof window === "undefined") {
    return [];
  }

  return parseStoredCart(window.localStorage.getItem(CART_STORAGE_KEY));
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setLines(readStoredLines());
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) {
      return;
    }

    window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(lines));
  }, [lines, ready]);

  const addProduct = useCallback(
    (product: Product, quantity = 1, personalization?: string, selectedColors?: SelectedProductColor[]) => {
      const normalizedQuantity = normalizeCartQuantity(quantity);
      if (normalizedQuantity === 0 || !Number.isFinite(product.price) || product.price < 0) {
        return;
      }

      const storedPersonalization = normalizePersonalization(personalization);
      const storedColors = selectedColors?.length ? selectedColors : undefined;
      const lineId = makeCartLineId(product.slug, storedPersonalization, storedColors);

      setLines((prev) => {
        const existing = prev.find((l) => l.lineId === lineId);
        if (existing) {
          return prev.map((l) =>
            l.lineId === lineId
              ? { ...l, quantity: normalizeCartQuantity(l.quantity + normalizedQuantity) }
              : l,
          );
        }

        return [
          ...prev,
          {
            lineId,
            slug: product.slug,
            title: product.title,
            price: product.price,
            quantity: normalizedQuantity,
            personalization: storedPersonalization,
            selectedColors: storedColors,
          },
        ];
      });
    },
    [],
  );

  const setQuantity = useCallback((lineId: string, quantity: number) => {
    const next = normalizeCartQuantity(quantity);
    setLines((prev) => {
      if (next === 0) {
        return prev.filter((l) => l.lineId !== lineId);
      }

      return prev.map((l) => (l.lineId === lineId ? { ...l, quantity: next } : l));
    });
  }, []);

  const removeLine = useCallback((lineId: string) => {
    setLines((prev) => prev.filter((l) => l.lineId !== lineId));
  }, []);

  const clear = useCallback(() => setLines([]), []);

  const value = useMemo<CartContextValue>(() => {
    const { itemCount, subtotal } = getCartTotals(lines);

    return {
      lines,
      itemCount,
      subtotal,
      addProduct,
      setQuantity,
      removeLine,
      clear,
    };
  }, [addProduct, clear, lines, removeLine, setQuantity]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) {
    throw new Error("useCart must be used within CartProvider");
  }

  return ctx;
}
