import assert from "node:assert/strict";
import test from "node:test";

import {
  parseEcontCitiesResponse,
  parseEcontOfficesResponse,
  shouldFallbackToManualEcont,
} from "@/lib/shipping/econt-lookup";

function mockResponse(status: number, body?: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response;
}

test("shouldFallbackToManualEcont handles 502 and 503", () => {
  assert.equal(shouldFallbackToManualEcont(mockResponse(502)), true);
  assert.equal(shouldFallbackToManualEcont(mockResponse(503)), true);
  assert.equal(shouldFallbackToManualEcont(mockResponse(200)), false);
});

test("shouldFallbackToManualEcont handles network and timeout errors", () => {
  assert.equal(shouldFallbackToManualEcont(null, new TypeError("fetch failed")), true);
  assert.equal(
    shouldFallbackToManualEcont(null, new DOMException("Aborted", "AbortError")),
    true,
  );
});

test("parseEcontCitiesResponse returns cities on success", async () => {
  const result = await parseEcontCitiesResponse(
    mockResponse(200, {
      cities: [{ id: 1, name: "София", postCode: "1000" }],
    }),
  );

  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.cities.length, 1);
    assert.equal(result.cities[0]?.name, "София");
  }
});

test("parseEcontCitiesResponse falls back on 503", async () => {
  const result = await parseEcontCitiesResponse(mockResponse(503));
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.reason, "unavailable");
  }
});

test("parseEcontCitiesResponse rejects invalid payload", async () => {
  const result = await parseEcontCitiesResponse(mockResponse(200, { offices: [] }));
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.reason, "invalid-json");
  }
});

test("parseEcontOfficesResponse rejects empty offices payload", async () => {
  const result = await parseEcontOfficesResponse(mockResponse(200, {}));
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.reason, "invalid-json");
  }
});

test("parseEcontOfficesResponse returns offices on success", async () => {
  const result = await parseEcontOfficesResponse(
    mockResponse(200, {
      offices: [
        {
          id: 1,
          code: "1",
          name: "Офис",
          isAPS: false,
          fullAddress: "София",
        },
      ],
    }),
  );

  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.offices.length, 1);
  }
});
