import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  ensureCampaignHandoffCartLine,
  isCampaignHandoffLinePersisted,
  readPersistedCartLines,
  resolveCampaignHandoffLineId,
  resolveCampaignHandoffRedirectGate,
} from "@/lib/cart/campaign-handoff-cart";
import type { Product } from "@/lib/catalog";

const productId = "11111111-1111-4111-8111-111111111111";

const simpleProduct: Product = {
  id: productId,
  slug: "peperuda",
  productCode: "VM-000010",
  title: "Пеперуда",
  description: "Описание",
  price: 19.5,
  images: [{ src: "/img.jpg", alt: "Пеперуда" }],
  fulfillmentType: "made_to_order",
  availabilityLabel: "Изработва се по поръчка",
  orderable: true,
};

const attribution = {
  source: "campaign-butterflies",
  campaign: "butterflies",
  landingUrl: "https://special.vemidi-crafts.com/valshebni-peperudi",
};

const handoffInput = {
  product: simpleProduct,
  quantity: 2,
  attribution,
};

const handoffSignature = "handoff-signature-v1";

type StorageMap = Map<string, string>;

function createLocalStorage(initial: StorageMap = new Map()): Storage {
  const store = new Map(initial);

  return {
    get length() {
      return store.size;
    },
    clear() {
      store.clear();
    },
    getItem(key: string) {
      return store.has(key) ? store.get(key)! : null;
    },
    key(index: number) {
      return [...store.keys()][index] ?? null;
    },
    removeItem(key: string) {
      store.delete(key);
    },
    setItem(key: string, value: string) {
      store.set(key, value);
    },
  };
}

function withBrowserStorage<T>(
  initial: StorageMap,
  run: (storage: Storage) => T,
): T {
  const previousWindow = globalThis.window;
  const previousLocalStorage = globalThis.localStorage;
  const storage = createLocalStorage(initial);

  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: { localStorage: storage },
  });
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: storage,
  });

  try {
    return run(storage);
  } finally {
    if (previousWindow === undefined) {
      Reflect.deleteProperty(globalThis, "window");
    } else {
      Object.defineProperty(globalThis, "window", {
        configurable: true,
        value: previousWindow,
      });
    }

    if (previousLocalStorage === undefined) {
      Reflect.deleteProperty(globalThis, "localStorage");
    } else {
      Object.defineProperty(globalThis, "localStorage", {
        configurable: true,
        value: previousLocalStorage,
      });
    }
  }
}

test("empty localStorage hydrates to empty cart before handoff ensure", () => {
  withBrowserStorage(new Map(), () => {
    const hydratedLines = readPersistedCartLines();
    assert.deepEqual(hydratedLines, []);

    const result = ensureCampaignHandoffCartLine(hydratedLines, handoffInput);
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.lines.length, 1);
      assert.equal(result.lines[0]?.quantity, 2);
      assert.equal(readPersistedCartLines().length, 1);
    }
  });
});

test("ensure persists cart line before redirect gate allows signature write", () => {
  withBrowserStorage(new Map(), () => {
    const lineId = resolveCampaignHandoffLineId(handoffInput);
    assert.ok(lineId);

    const ensureResult = ensureCampaignHandoffCartLine([], handoffInput);
    assert.equal(ensureResult.ok, true);
    assert.equal(isCampaignHandoffLinePersisted(lineId!), true);

    const gate = resolveCampaignHandoffRedirectGate({
      handoffSignature,
      previousSignature: null,
      lineId,
      lines: ensureResult.ok ? ensureResult.lines : [],
    });
    assert.equal(gate.action, "ensure_then_redirect");
  });
});

test("signature exists but missing cart line triggers ensure instead of redirect", () => {
  withBrowserStorage(new Map(), () => {
    const lineId = resolveCampaignHandoffLineId(handoffInput);
    assert.ok(lineId);

    const gate = resolveCampaignHandoffRedirectGate({
      handoffSignature,
      previousSignature: handoffSignature,
      lineId,
      lines: [],
    });

    assert.equal(gate.action, "ensure_then_redirect");
  });
});

test("signature and persisted cart line allow redirect without duplicate add", () => {
  withBrowserStorage(new Map(), () => {
    const ensureResult = ensureCampaignHandoffCartLine([], handoffInput);
    assert.equal(ensureResult.ok, true);
    if (!ensureResult.ok) {
      return;
    }

    const gate = resolveCampaignHandoffRedirectGate({
      handoffSignature,
      previousSignature: handoffSignature,
      lineId: ensureResult.lineId,
      lines: ensureResult.lines,
    });

    assert.equal(gate.action, "redirect");

    const replay = ensureCampaignHandoffCartLine(ensureResult.lines, handoffInput);
    assert.equal(replay.ok, true);
    if (replay.ok) {
      assert.equal(replay.lines.length, 1);
      assert.equal(replay.lines[0]?.quantity, 2);
    }
  });
});

test("strict mode double ensure does not increase quantity", () => {
  withBrowserStorage(new Map(), () => {
    const first = ensureCampaignHandoffCartLine([], handoffInput);
    const second = ensureCampaignHandoffCartLine(
      first.ok ? first.lines : [],
      handoffInput,
    );

    assert.equal(first.ok, true);
    assert.equal(second.ok, true);
    if (first.ok && second.ok) {
      assert.equal(second.lines.length, 1);
      assert.equal(second.lines[0]?.quantity, 2);
    }
  });
});

test("campaign handoff preserves options and attribution on persisted line", () => {
  withBrowserStorage(new Map(), () => {
    const result = ensureCampaignHandoffCartLine([], handoffInput);
    assert.equal(result.ok, true);
    if (!result.ok) {
      return;
    }

    const [line] = result.lines;
    assert.equal(line?.campaign, "butterflies");
    assert.equal(line?.source, "campaign-butterflies");
    assert.equal(
      line?.landingUrl,
      "https://special.vemidi-crafts.com/valshebni-peperudi",
    );
    assert.equal(line?.quantity, 2);
    assert.equal(line?.price, 19.5);

    const stored = readPersistedCartLines()[0];
    assert.equal(stored?.campaign, line?.campaign);
    assert.equal(stored?.source, line?.source);
    assert.equal(stored?.landingUrl, line?.landingUrl);
  });
});

test("failed persist blocks redirect path by leaving gate on ensure", () => {
  withBrowserStorage(new Map(), () => {
    const lineId = resolveCampaignHandoffLineId(handoffInput);
    assert.ok(lineId);

    const gate = resolveCampaignHandoffRedirectGate({
      handoffSignature,
      previousSignature: handoffSignature,
      lineId,
      lines: [],
      persistedLines: [],
    });

    assert.equal(gate.action, "ensure_then_redirect");
  });
});

test("campaign checkout bridge waits for cart hydration before handoff work", () => {
  const bridgeSource = readFileSync(
    new URL("../components/campaign/campaign-checkout-bridge.tsx", import.meta.url),
    "utf8",
  );
  const providerSource = readFileSync(
    new URL("../components/cart/cart-provider.tsx", import.meta.url),
    "utf8",
  );

  assert.match(bridgeSource, /if \(!ready \|\| handled\.current\)/);
  assert.match(bridgeSource, /ensureCampaignHandoffLine/);
  assert.match(
    bridgeSource,
    /window\.sessionStorage\.setItem\(CAMPAIGN_HANDOFF_SESSION_KEY, handoffSignature\)/,
  );
  assert.match(bridgeSource, /router\.replace\("\/checkout"\)/);
  const ensureIndex = bridgeSource.indexOf("ensureCampaignHandoffLine(handoffInput)");
  const signatureIndex = bridgeSource.indexOf(
    "window.sessionStorage.setItem(CAMPAIGN_HANDOFF_SESSION_KEY, handoffSignature)",
  );
  assert.ok(ensureIndex >= 0);
  assert.ok(signatureIndex > ensureIndex);
  assert.match(providerSource, /ready: boolean/);
  assert.match(providerSource, /ensureCampaignHandoffLine/);
});

test("handoff session signature is written only after successful cart persist path", () => {
  const bridgeSource = readFileSync(
    new URL("../components/campaign/campaign-checkout-bridge.tsx", import.meta.url),
    "utf8",
  );

  const ensureIndex = bridgeSource.indexOf("ensureCampaignHandoffLine(handoffInput)");
  const signatureIndex = bridgeSource.indexOf(
    `window.sessionStorage.setItem(CAMPAIGN_HANDOFF_SESSION_KEY, handoffSignature)`,
  );
  const redirectIndex = bridgeSource.lastIndexOf(`router.replace("/checkout")`);

  assert.ok(ensureIndex >= 0);
  assert.ok(signatureIndex > ensureIndex);
  assert.ok(redirectIndex > signatureIndex);
  assert.match(bridgeSource, /CAMPAIGN_HANDOFF_SESSION_KEY/);
});
