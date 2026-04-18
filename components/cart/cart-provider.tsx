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

  try {
    const raw = window.localStorage.getItem(CART_STORAGE_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }

    const out: CartLine[] = [];

    for (const row of parsed) {
      if (typeof row !== "object" || row === null) {
        continue;
      }

      const r = row as Record<string, unknown>;
      const slug = r.slug;
      const title = r.title;
      const price = r.price;
      const quantity = r.quantity;

      if (typeof slug !== "string" || typeof title !== "string") {
        continue;
      }
      if (typeof price !== "number" || typeof quantity !== "number") {
        continue;
      }

      const personalization =
        typeof r.personalization === "string" ? r.personalization : undefined;
      const selectedColors = Array.isArray(r.selectedColors)
        ? (r.selectedColors.filter((item): item is SelectedProductColor => {
            if (typeof item !== "object" || item === null) {
              return false;
            }
            const i = item as Record<string, unknown>;
            const baseValid =
              typeof i.groupId === "string" &&
              typeof i.groupKey === "string" &&
              typeof i.groupLabel === "string" &&
              typeof i.optionId === "string" &&
              typeof i.optionName === "string" &&
              (typeof i.optionHex === "string" || i.optionHex === null);

            if (!baseValid) {
              return false;
            }

            if (typeof i.fieldId === "string" && typeof i.fieldLabel === "string") {
              return true;
            }

            // Backward compatibility: older cart entries had no field info.
            i.fieldId = `${i.groupId}`;
            i.fieldLabel = `${i.groupLabel}`;
            return true;
          }) as SelectedProductColor[])
        : undefined;
      const lineId =
        typeof r.lineId === "string"
          ? r.lineId
          : makeCartLineId(slug, personalization, selectedColors);

      out.push({
        lineId,
        slug,
        title,
        price,
        quantity,
        personalization,
        selectedColors,
      });
    }

    return out;
  } catch {
    return [];
  }
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
      const lineId = makeCartLineId(product.slug, personalization, selectedColors);
      const trimmed = personalization?.trim();
      const storedPersonalization = trimmed ? trimmed.slice(0, 50) : undefined;
      const storedColors = selectedColors?.length ? selectedColors : undefined;

      setLines((prev) => {
        const existing = prev.find((l) => l.lineId === lineId);
        if (existing) {
          return prev.map((l) =>
            l.lineId === lineId ? { ...l, quantity: l.quantity + quantity } : l,
          );
        }

        return [
          ...prev,
          {
            lineId,
            slug: product.slug,
            title: product.title,
            price: product.price,
            quantity,
            personalization: storedPersonalization,
            selectedColors: storedColors,
          },
        ];
      });
    },
    [],
  );

  const setQuantity = useCallback((lineId: string, quantity: number) => {
    const next = Math.max(0, Math.floor(quantity));
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
    const itemCount = lines.reduce((sum, l) => sum + l.quantity, 0);
    const subtotal = lines.reduce((sum, l) => sum + l.price * l.quantity, 0);

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
