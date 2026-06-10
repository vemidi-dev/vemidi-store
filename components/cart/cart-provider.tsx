"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { CartAddedToast } from "@/components/cart/cart-added-toast";
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
import type { ProductPersonalizationValue } from "@/lib/product-personalization";

type CartContextValue = {
  lines: CartLine[];
  itemCount: number;
  subtotal: number;
  addProduct: (
    product: Product,
    quantity?: number,
    personalization?: string,
    selectedColors?: SelectedProductColor[],
    personalizationFields?: ProductPersonalizationValue[],
  ) => void;
  setQuantity: (lineId: string, quantity: number) => void;
  removeLine: (lineId: string) => void;
  clear: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);

const CART_TOAST_DURATION_MS = 4500;

type CartAddedToastState = {
  id: number;
  title: string;
};

function readStoredLines(): CartLine[] {
  if (typeof window === "undefined") {
    return [];
  }

  return parseStoredCart(window.localStorage.getItem(CART_STORAGE_KEY));
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [ready, setReady] = useState(false);
  const [addedToast, setAddedToast] = useState<CartAddedToastState | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) {
        clearTimeout(toastTimerRef.current);
      }
    };
  }, []);

  const dismissAddedToast = useCallback(() => {
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
      toastTimerRef.current = null;
    }
    setAddedToast(null);
  }, []);

  const showAddedToast = useCallback((title: string) => {
    const toastId = Date.now();
    setAddedToast({ id: toastId, title });

    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
    }

    toastTimerRef.current = setTimeout(() => {
      setAddedToast((current) => (current?.id === toastId ? null : current));
      toastTimerRef.current = null;
    }, CART_TOAST_DURATION_MS);
  }, []);

  const addProduct = useCallback(
    (
      product: Product,
      quantity = 1,
      personalization?: string,
      selectedColors?: SelectedProductColor[],
      personalizationFields?: ProductPersonalizationValue[],
    ) => {
      const normalizedQuantity = normalizeCartQuantity(quantity);
      if (normalizedQuantity === 0 || !Number.isFinite(product.price) || product.price < 0) {
        return;
      }

      const storedPersonalization = normalizePersonalization(personalization);
      const storedColors = selectedColors?.length ? selectedColors : undefined;
      const storedPersonalizationFields = personalizationFields?.length
        ? personalizationFields
        : undefined;
      const lineId = makeCartLineId(
        product.slug,
        storedPersonalization,
        storedColors,
        storedPersonalizationFields,
      );

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
            personalizationFields: storedPersonalizationFields,
            selectedColors: storedColors,
          },
        ];
      });

      showAddedToast(product.title);
    },
    [showAddedToast],
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

  return (
    <CartContext.Provider value={value}>
      {children}
      {addedToast ? (
        <CartAddedToast title={addedToast.title} onDismiss={dismissAddedToast} />
      ) : null}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) {
    throw new Error("useCart must be used within CartProvider");
  }

  return ctx;
}
