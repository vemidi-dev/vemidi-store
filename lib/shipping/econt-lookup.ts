import type { EcontCity, EcontOffice } from "@/lib/shipping/econt";

export const ECONT_LOOKUP_UNAVAILABLE_MESSAGE =
  "Еконт справочникът временно не е достъпен. Моля, въведете данните за доставка ръчно.";

export type EcontLookupFailureReason =
  | "unavailable"
  | "bad-status"
  | "invalid-json"
  | "network"
  | "timeout";

export type EcontCitiesLookupResult =
  | { ok: true; cities: EcontCity[] }
  | { ok: false; reason: EcontLookupFailureReason };

export type EcontOfficesLookupResult =
  | { ok: true; offices: EcontOffice[] }
  | { ok: false; reason: EcontLookupFailureReason };

export function shouldFallbackToManualEcont(
  response: Response | null,
  error?: unknown,
): boolean {
  if (error instanceof DOMException && error.name === "AbortError") {
    return true;
  }

  if (error instanceof TypeError) {
    return true;
  }

  if (!response) {
    return true;
  }

  return response.status === 502 || response.status === 503;
}

export async function parseEcontCitiesResponse(
  response: Response,
): Promise<EcontCitiesLookupResult> {
  if (shouldFallbackToManualEcont(response)) {
    return {
      ok: false,
      reason: response.status === 503 ? "unavailable" : "bad-status",
    };
  }

  if (!response.ok) {
    return { ok: false, reason: "bad-status" };
  }

  try {
    const payload = (await response.json()) as { cities?: EcontCity[] };
    if (!Array.isArray(payload.cities)) {
      return { ok: false, reason: "invalid-json" };
    }

    return { ok: true, cities: payload.cities };
  } catch {
    return { ok: false, reason: "invalid-json" };
  }
}

export async function parseEcontOfficesResponse(
  response: Response,
): Promise<EcontOfficesLookupResult> {
  if (!response.ok) {
    return {
      ok: false,
      reason: response.status === 503 ? "unavailable" : "bad-status",
    };
  }

  try {
    const payload = (await response.json()) as { offices?: EcontOffice[] };
    if (!Array.isArray(payload.offices)) {
      return { ok: false, reason: "invalid-json" };
    }

    return { ok: true, offices: payload.offices };
  } catch {
    return { ok: false, reason: "invalid-json" };
  }
}

export function getEcontLookupErrorMessage(reason: EcontLookupFailureReason): string {
  if (reason === "timeout" || reason === "network") {
    return "Неуспешно зареждане от Еконт. Опитайте отново или въведете данните ръчно.";
  }

  return ECONT_LOOKUP_UNAVAILABLE_MESSAGE;
}
