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
import {
  buildCampaignAttribution,
  mergeCampaignAttribution,
  type CampaignAttribution,
} from "@/lib/campaign-attribution";
import { CAMPAIGN_ATTRIBUTION_SESSION_KEY } from "@/lib/cart-types";
import type { Product } from "@/lib/catalog";
import { makeCartLineId } from "@/lib/cart-line-id";
import {
  getCartTotals,
  normalizePersonalization,
  parseStoredCart,
} from "@/lib/cart-storage";
import {
  normalizeCartQuantityWithLimit,
} from "@/lib/cart/quantity-limits";
import {
  calculateEstimatedUnitPrice,
} from "@/lib/product-option-pricing";
import type { ProductOptionSelection } from "@/lib/product-options";
import { CART_STORAGE_KEY, LEGACY_CART_STORAGE_KEY, type CartLine } from "@/lib/cart-types";
import type { SelectedProductColor } from "@/lib/product-colors";
import type { ProductPersonalizationValue } from "@/lib/product-personalization";
import { calculatePersonalizationDelta } from "@/lib/product-personalization";

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
    attribution?: CampaignAttribution,
    optionSelections?: ProductOptionSelection[],
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
  imageSrc?: string;
  price: number;
  quantity: number;
};

function readStoredLines(): CartLine[] {
  if (typeof window === "undefined") {
    return [];
  }

  const current = parseStoredCart(window.localStorage.getItem(CART_STORAGE_KEY));
  if (current.length > 0) {
    return current;
  }

  const legacy = parseStoredCart(window.localStorage.getItem(LEGACY_CART_STORAGE_KEY));
  if (legacy.length > 0) {
    window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(legacy));
    window.localStorage.removeItem(LEGACY_CART_STORAGE_KEY);
  }
  return legacy;
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

  const showAddedToast = useCallback(
    (product: Pick<Product, "title" | "images" | "price">, quantity: number) => {
      const toastId = Date.now();
      setAddedToast({
        id: toastId,
        title: product.title,
        imageSrc: product.images.find((image) => image.src)?.src,
        price: product.price,
        quantity,
      });

      if (toastTimerRef.current) {
        clearTimeout(toastTimerRef.current);
      }

      toastTimerRef.current = setTimeout(() => {
        setAddedToast((current) => (current?.id === toastId ? null : current));
        toastTimerRef.current = null;
      }, CART_TOAST_DURATION_MS);
    },
    [],
  );

  const addProduct = useCallback(
    (
      product: Product,
      quantity = 1,
      personalization?: string,
      selectedColors?: SelectedProductColor[],
      personalizationFields?: ProductPersonalizationValue[],
      attribution?: CampaignAttribution,
      optionSelections?: ProductOptionSelection[],
    ) => {
      const normalizedQuantity = normalizeCartQuantityWithLimit(
        quantity,
        product.maxCartQuantity,
      );
      if (
        normalizedQuantity === 0 ||
        !Number.isFinite(product.price) ||
        product.price < 0 ||
        !product.orderable
      ) {
        return;
      }

      const storedPersonalization = normalizePersonalization(personalization);
      const storedColors = selectedColors?.length ? selectedColors : undefined;
      const storedPersonalizationFields = personalizationFields?.length
        ? personalizationFields
        : undefined;
      const storedOptionSelections = optionSelections?.length
        ? optionSelections
        : undefined;
      const storedAttribution = buildCampaignAttribution(attribution ?? {});
      if (storedAttribution && typeof window !== "undefined") {
        window.sessionStorage.setItem(
          CAMPAIGN_ATTRIBUTION_SESSION_KEY,
          JSON.stringify(storedAttribution),
        );
      }
      const optionPrice = product.optionGroups?.length
        ? calculateEstimatedUnitPrice(
            product.price,
            product.optionGroups,
            storedOptionSelections ?? [],
          )
        : product.price;
      const estimatedPrice =
        optionPrice +
        calculatePersonalizationDelta(
          product.personalizationFields,
          storedPersonalizationFields,
        );
      const lineId = makeCartLineId(
        product.id,
        storedPersonalization,
        storedColors,
        storedPersonalizationFields,
        storedOptionSelections,
      );

      setLines((prev) => {
        const existing = prev.find((l) => l.lineId === lineId);
        if (existing) {
          return prev.map((l) => {
            if (l.lineId !== lineId) {
              return l;
            }

            const mergedAttribution = mergeCampaignAttribution(
              buildCampaignAttribution({
                campaign: l.campaign,
                source: l.source,
                landingUrl: l.landingUrl,
              }),
              storedAttribution,
            );

            return {
              ...l,
              campaign: mergedAttribution?.campaign ?? l.campaign,
              source: mergedAttribution?.source ?? l.source,
              landingUrl: mergedAttribution?.landingUrl ?? l.landingUrl,
              quantity: normalizeCartQuantityWithLimit(
                l.quantity + normalizedQuantity,
                l.maxCartQuantity ?? product.maxCartQuantity,
              ),
            };
          });
        }

        return [
          ...prev,
          {
            lineId,
            productId: product.id,
            slug: product.slug,
            title: product.title,
            imageSrc: product.images.find((image) => image.src)?.src,
            price: estimatedPrice,
            quantity: normalizedQuantity,
            maxCartQuantity: product.maxCartQuantity,
            campaign: storedAttribution?.campaign,
            source: storedAttribution?.source,
            landingUrl: storedAttribution?.landingUrl,
            personalization: storedPersonalization,
            personalizationFields: storedPersonalizationFields,
            selectedColors: storedColors,
            optionSelections: storedOptionSelections,
          },
        ];
      });

      showAddedToast(product, normalizedQuantity);
    },
    [showAddedToast],
  );

  const setQuantity = useCallback((lineId: string, quantity: number) => {
    setLines((prev) => {
      const line = prev.find((entry) => entry.lineId === lineId);
      const next = normalizeCartQuantityWithLimit(quantity, line?.maxCartQuantity);
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
        <CartAddedToast
          title={addedToast.title}
          imageSrc={addedToast.imageSrc}
          price={addedToast.price}
          quantity={addedToast.quantity}
          onDismiss={dismissAddedToast}
        />
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
