import type { SpeedyCity, SpeedyOffice } from "@/lib/shipping/speedy";

export const SPEEDY_LOOKUP_UNAVAILABLE_MESSAGE =
  "Спиди справочникът временно не е достъпен. Моля, въведете данните за доставка ръчно.";

export type SpeedyLookupFailureReason =
  | "unavailable"
  | "bad-status"
  | "invalid-json"
  | "network"
  | "timeout";

export type SpeedyCitiesLookupResult =
  | { ok: true; cities: SpeedyCity[] }
  | { ok: false; reason: SpeedyLookupFailureReason };

export type SpeedyOfficesLookupResult =
  | { ok: true; offices: SpeedyOffice[] }
  | { ok: false; reason: SpeedyLookupFailureReason };

export function shouldFallbackToManualSpeedy(
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

export async function parseSpeedyCitiesResponse(
  response: Response,
): Promise<SpeedyCitiesLookupResult> {
  if (shouldFallbackToManualSpeedy(response)) {
    return {
      ok: false,
      reason: response.status === 503 ? "unavailable" : "bad-status",
    };
  }

  if (!response.ok) {
    return { ok: false, reason: "bad-status" };
  }

  try {
    const payload = (await response.json()) as { cities?: SpeedyCity[] };
    if (!Array.isArray(payload.cities)) {
      return { ok: false, reason: "invalid-json" };
    }

    return { ok: true, cities: payload.cities };
  } catch {
    return { ok: false, reason: "invalid-json" };
  }
}

export async function parseSpeedyOfficesResponse(
  response: Response,
): Promise<SpeedyOfficesLookupResult> {
  if (!response.ok) {
    return {
      ok: false,
      reason: response.status === 503 ? "unavailable" : "bad-status",
    };
  }

  try {
    const payload = (await response.json()) as { offices?: SpeedyOffice[] };
    if (!Array.isArray(payload.offices)) {
      return { ok: false, reason: "invalid-json" };
    }

    return { ok: true, offices: payload.offices };
  } catch {
    return { ok: false, reason: "invalid-json" };
  }
}

export function getSpeedyLookupErrorMessage(reason: SpeedyLookupFailureReason): string {
  if (reason === "timeout" || reason === "network") {
    return "Неуспешно зареждане от Спиди. Опитайте отново или въведете данните ръчно.";
  }

  return SPEEDY_LOOKUP_UNAVAILABLE_MESSAGE;
}
