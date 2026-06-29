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
  type CampaignAttribution,
} from "@/lib/campaign-attribution";
import { CAMPAIGN_ATTRIBUTION_SESSION_KEY } from "@/lib/cart-types";
import type { Product } from "@/lib/catalog";
import {
  ensureCampaignHandoffCartLine,
  type CampaignHandoffCartInput,
} from "@/lib/cart/campaign-handoff-cart";
import {
  mergeCartLineForAdd,
  prepareCartLineInput,
} from "@/lib/cart/prepare-cart-line";
import { normalizeCartQuantityWithLimit } from "@/lib/cart/quantity-limits";
import {
  getCartTotals,
  parseStoredCart,
} from "@/lib/cart-storage";
import { CART_STORAGE_KEY, LEGACY_CART_STORAGE_KEY, type CartLine } from "@/lib/cart-types";
import { trackMetaAddToCart } from "@/lib/consent/meta-pixel-client";
import type { SelectedProductColor } from "@/lib/product-colors";
import type { ProductPersonalizationValue } from "@/lib/product-personalization";
import type { ProductOptionSelection } from "@/lib/product-options";

type EnsureCampaignHandoffLineResult =
  | { ok: true; lineId: string; persisted: true }
  | { ok: false; lineId: string; persisted: false; notReady?: boolean };

type CartContextValue = {
  ready: boolean;
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
  ensureCampaignHandoffLine: (
    input: CampaignHandoffCartInput,
  ) => EnsureCampaignHandoffLineResult;
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
  const linesRef = useRef<CartLine[]>([]);

  useEffect(() => {
    const storedLines = readStoredLines();
    linesRef.current = storedLines;
    setLines(storedLines);
    setReady(true);
  }, []);

  useEffect(() => {
    linesRef.current = lines;
  }, [lines]);

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
      const prepared = prepareCartLineInput({
        product,
        quantity,
        personalization,
        selectedColors,
        personalizationFields,
        attribution,
        optionSelections,
      });
      if (!prepared) {
        return;
      }

      if (prepared.storedAttribution && typeof window !== "undefined") {
        window.sessionStorage.setItem(
          CAMPAIGN_ATTRIBUTION_SESSION_KEY,
          JSON.stringify(prepared.storedAttribution),
        );
      }

      setLines((prev) => mergeCartLineForAdd(prev, prepared));
      showAddedToast(product, prepared.normalizedQuantity);
      trackMetaAddToCart({
        slug: product.slug,
        title: product.title,
        price: product.price,
        quantity: prepared.normalizedQuantity,
      });
    },
    [showAddedToast],
  );

  const ensureCampaignHandoffLine = useCallback(
    (input: CampaignHandoffCartInput): EnsureCampaignHandoffLineResult => {
      if (!ready) {
        return {
          ok: false,
          lineId: "",
          persisted: false,
          notReady: true,
        };
      }

      const result = ensureCampaignHandoffCartLine(linesRef.current, input);
      if (!result.ok) {
        return {
          ok: false,
          lineId: result.lineId,
          persisted: false,
        };
      }

      linesRef.current = result.lines;
      setLines(result.lines);

      const storedAttribution = buildCampaignAttribution(input.attribution ?? {});
      if (storedAttribution && typeof window !== "undefined") {
        window.sessionStorage.setItem(
          CAMPAIGN_ATTRIBUTION_SESSION_KEY,
          JSON.stringify(storedAttribution),
        );
      }

      return {
        ok: true,
        lineId: result.lineId,
        persisted: true,
      };
    },
    [ready],
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
      ready,
      lines,
      itemCount,
      subtotal,
      addProduct,
      ensureCampaignHandoffLine,
      setQuantity,
      removeLine,
      clear,
    };
  }, [addProduct, clear, ensureCampaignHandoffLine, lines, ready, removeLine, setQuantity]);

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
