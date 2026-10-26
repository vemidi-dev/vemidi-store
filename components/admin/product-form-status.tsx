"use client";

import { createContext, useContext } from "react";

export const ProductFormPendingContext = createContext(false);
export function useProductFormPending() {
  return useContext(ProductFormPendingContext);
}
