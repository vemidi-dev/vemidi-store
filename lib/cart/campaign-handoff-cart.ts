import { parseStoredCart } from "@/lib/cart-storage";
import {
  mergeCartLineForCampaignHandoff,
  prepareCartLineInput,
  type PrepareCartLineInput,
} from "@/lib/cart/prepare-cart-line";
import { CART_STORAGE_KEY, type CartLine } from "@/lib/cart-types";

export type CampaignHandoffCartInput = PrepareCartLineInput;

export type EnsureCampaignHandoffCartResult =
  | { ok: true; lines: CartLine[]; lineId: string }
  | { ok: false; lineId: string };

export function resolveCampaignHandoffLineId(
  input: CampaignHandoffCartInput,
): string | null {
  return prepareCartLineInput(input)?.lineId ?? null;
}

export function readPersistedCartLines(): CartLine[] {
  if (typeof window === "undefined") {
    return [];
  }

  return parseStoredCart(window.localStorage.getItem(CART_STORAGE_KEY));
}

export function persistCartLines(lines: CartLine[]): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(lines));
}

export function isCampaignHandoffLinePersisted(
  lineId: string,
  lines: CartLine[] = readPersistedCartLines(),
): boolean {
  return lines.some((line) => line.lineId === lineId);
}

export function ensureCampaignHandoffCartLine(
  existingLines: CartLine[],
  input: CampaignHandoffCartInput,
): EnsureCampaignHandoffCartResult {
  const prepared = prepareCartLineInput(input);
  if (!prepared) {
    return { ok: false, lineId: "" };
  }

  const nextLines = mergeCartLineForCampaignHandoff(existingLines, prepared);
  persistCartLines(nextLines);

  if (!isCampaignHandoffLinePersisted(prepared.lineId, nextLines)) {
    return { ok: false, lineId: prepared.lineId };
  }

  return {
    ok: true,
    lines: nextLines,
    lineId: prepared.lineId,
  };
}

export type CampaignHandoffRedirectGateInput = {
  handoffSignature: string;
  previousSignature: string | null;
  lineId: string | null;
  lines: CartLine[];
  persistedLines?: CartLine[];
};

export type CampaignHandoffRedirectGateResult =
  | { action: "redirect" }
  | { action: "ensure_then_redirect" }
  | { action: "wait" };

export function resolveCampaignHandoffRedirectGate(
  input: CampaignHandoffRedirectGateInput,
): CampaignHandoffRedirectGateResult {
  if (!input.lineId) {
    return { action: "wait" };
  }

  const persistedLines = input.persistedLines ?? readPersistedCartLines();
  const linePresent =
    input.lines.some((line) => line.lineId === input.lineId) ||
    isCampaignHandoffLinePersisted(input.lineId, persistedLines);

  if (input.previousSignature === input.handoffSignature && linePresent) {
    return { action: "redirect" };
  }

  return { action: "ensure_then_redirect" };
}
