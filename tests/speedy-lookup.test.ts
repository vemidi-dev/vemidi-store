import assert from "node:assert/strict";
import test from "node:test";

import {
  parseSpeedyCitiesResponse,
  parseSpeedyOfficesResponse,
} from "@/lib/shipping/speedy-lookup";

test("parseSpeedyCitiesResponse reads valid city payloads", async () => {
  const result = await parseSpeedyCitiesResponse(
    new Response(
      JSON.stringify({
        cities: [{ id: 68134, name: "София", postCode: "1000", regionName: "София" }],
      }),
      { status: 200 },
    ),
  );

  assert.deepEqual(result, {
    ok: true,
    cities: [{ id: 68134, name: "София", postCode: "1000", regionName: "София" }],
  });
});

test("parseSpeedyOfficesResponse reads valid office payloads", async () => {
  const result = await parseSpeedyOfficesResponse(
    new Response(
      JSON.stringify({
        offices: [
          {
            id: 12001,
            name: "APT СОФИЯ МЛАДОСТ",
            isAPS: true,
            fullAddress: "София, ж.к. Младост 1",
          },
        ],
      }),
      { status: 200 },
    ),
  );

  assert.deepEqual(result, {
    ok: true,
    offices: [
      {
        id: 12001,
        name: "APT СОФИЯ МЛАДОСТ",
        isAPS: true,
        fullAddress: "София, ж.к. Младост 1",
      },
    ],
  });
});
