import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import type { CartLine } from "@/lib/cart-types";
import { resolveOrderAttributionFromLines } from "@/lib/campaign-attribution";
import {
  CHECKOUT_LANDING_RETURN_LABEL,
  getCheckoutLandingReturnLinkProps,
  resolveCheckoutLandingReturnUrl,
} from "@/lib/checkout/checkout-landing-return";

const landingUrlA = "https://special.vemidi-crafts.com/valshebni-peperudi";
const landingUrlB = "https://special.vemidi-crafts.com/drug-slug";

function makeLine(overrides: Partial<CartLine> = {}): CartLine {
  return {
    lineId: "line-1",
    productId: "11111111-1111-4111-8111-111111111111",
    slug: "peperuda",
    title: "Пеперуда",
    price: 19.5,
    quantity: 1,
    ...overrides,
  };
}

test("resolveCheckoutLandingReturnUrl returns one valid landing URL", () => {
  assert.equal(
    resolveCheckoutLandingReturnUrl([
      makeLine({ landingUrl: landingUrlA }),
    ]),
    landingUrlA,
  );
});

test("resolveCheckoutLandingReturnUrl treats duplicate URLs as one unique landing", () => {
  assert.equal(
    resolveCheckoutLandingReturnUrl([
      makeLine({ lineId: "line-1", landingUrl: landingUrlA }),
      makeLine({ lineId: "line-2", landingUrl: landingUrlA }),
    ]),
    landingUrlA,
  );
});

test("resolveCheckoutLandingReturnUrl returns null when no landing URL exists", () => {
  assert.equal(resolveCheckoutLandingReturnUrl([makeLine()]), null);
  assert.equal(
    resolveCheckoutLandingReturnUrl([
      makeLine(),
      makeLine({ lineId: "line-2", campaign: "butterflies" }),
    ]),
    null,
  );
});

test("resolveCheckoutLandingReturnUrl ignores invalid or external landing URLs", () => {
  assert.equal(
    resolveCheckoutLandingReturnUrl([
      makeLine({ landingUrl: "https://evil.example/phish" }),
    ]),
    null,
  );
  assert.equal(
    resolveCheckoutLandingReturnUrl([
      makeLine({ landingUrl: "javascript:alert(1)" }),
      makeLine({ lineId: "line-2", landingUrl: landingUrlA }),
    ]),
    landingUrlA,
  );
});

test("resolveCheckoutLandingReturnUrl hides link for mixed landing URLs", () => {
  assert.equal(
    resolveCheckoutLandingReturnUrl([
      makeLine({ lineId: "line-1", landingUrl: landingUrlA }),
      makeLine({ lineId: "line-2", landingUrl: landingUrlB }),
    ]),
    null,
  );
});

test("standard store cart without campaign attribution keeps checkout return hidden", () => {
  const lines = [
    makeLine({ source: undefined, campaign: undefined, landingUrl: undefined }),
    makeLine({
      lineId: "line-2",
      slug: "kutiya",
      title: "Кутия",
      source: undefined,
      campaign: undefined,
      landingUrl: undefined,
    }),
  ];

  assert.equal(resolveCheckoutLandingReturnUrl(lines), null);
  assert.equal(resolveOrderAttributionFromLines(lines), undefined);
});

test("checkout landing return link opens in the same tab without mutating cart data", () => {
  const lines = [makeLine({ landingUrl: landingUrlA })];
  const returnUrl = resolveCheckoutLandingReturnUrl(lines);
  assert.ok(returnUrl);

  const props = getCheckoutLandingReturnLinkProps(returnUrl);
  assert.equal(props.href, landingUrlA);
  assert.equal(props["aria-label"], CHECKOUT_LANDING_RETURN_LABEL);
  assert.equal("target" in props, false);

  lines[0]!.quantity = 99;
  assert.equal(lines[0]!.landingUrl, landingUrlA);
  assert.equal(resolveCheckoutLandingReturnUrl(lines), landingUrlA);
});

test("checkout panel uses plain anchor without target blank or history navigation", () => {
  const source = readFileSync(
    new URL("../components/checkout/checkout-panel.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /resolveCheckoutLandingReturnUrl/);
  assert.match(source, /CHECKOUT_LANDING_RETURN_LABEL/);
  assert.match(
    source,
    /\{landingReturnLinkProps \? \(\s*<a[\s\S]*?\{CHECKOUT_LANDING_RETURN_LABEL\}/,
  );
  assert.doesNotMatch(
    source,
    /\{landingReturnLinkProps[\s\S]*target="_blank"/,
  );
  assert.doesNotMatch(source, /window\.history/);
});
