import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, test } from "node:test";

import { getGlobalFaqItems, getProductFaqItems } from "@/lib/faq/repository";
import { mergeGlobalFaqCandidates, toActiveFaqItem } from "@/lib/faq/resolve";
import type { FaqItemRow } from "@/lib/faq/types";
import { revalidateGlobalFaqPaths } from "@/lib/faq/revalidate";

function readSource(relativePath: string) {
  return readFileSync(new URL(relativePath, import.meta.url), "utf8");
}

function faqItemRow(overrides: Partial<FaqItemRow> = {}): FaqItemRow {
  return {
    id: "item-1",
    question: "Колко време отнема изработката?",
    answer: "Обикновено 1–5 работни дни.",
    is_active: true,
    sort_order: 0,
    created_at: "2026-06-25T00:00:00.000Z",
    updated_at: "2026-06-25T00:00:00.000Z",
    ...overrides,
  };
}

describe("FAQ storefront wiring", () => {
  test("home page loads global FAQ only via getGlobalFaqItems", () => {
    const homePage = readSource("../app/page.tsx");
    const productPage = readSource("../app/products/[slug]/page.tsx");

    assert.match(homePage, /getGlobalFaqItems\(\)/);
    assert.match(homePage, /globalFaqItems/);
    assert.doesNotMatch(homePage, /getProductFaqItems/);

    assert.match(productPage, /getProductFaqItems\(product\.id/);
    assert.doesNotMatch(productPage, /getGlobalFaqItems/);
  });

  test("product page passes real product id into gallery aside FAQ props", () => {
    const productPage = readSource("../app/products/[slug]/page.tsx");

    assert.match(productPage, /faqItems=\{productFaqItems\}/);
    assert.match(productPage, /faqIdPrefix=\{`product-faq-\$\{product\.id\}`\}/);
    assert.match(productPage, /ProductDetailGalleryAside/);
  });

  test("home FAQ section is placed before newsletter CTA", () => {
    const homeContent = readSource("../components/home/home-content-sections.tsx");

    const faqIndex = homeContent.indexOf('<FaqSection idPrefix="home-faq"');
    const newsletterIndex = homeContent.indexOf("<NewsletterForm");

    assert.ok(faqIndex >= 0);
    assert.ok(newsletterIndex > faqIndex);
  });

  test("product FAQ section is rendered after fulfillment in gallery aside", () => {
    const aside = readSource("../components/product/product-detail-content-sections.tsx");

    const fulfillmentIndex = aside.indexOf("ProductDetailFulfillmentInfo");
    const faqIndex = aside.indexOf("<FaqSection");

    assert.ok(fulfillmentIndex >= 0);
    assert.ok(faqIndex > fulfillmentIndex);
    assert.match(aside, /variant="product"/);
  });
});

describe("FAQ empty rendering", () => {
  test("FaqSection returns null when items are empty", () => {
    const section = readSource("../components/faq/faq-section.tsx");

    assert.match(section, /if \(!items\.length\)/);
    assert.match(section, /return null/);
  });

  test("FaqAccordion returns null when items are empty", () => {
    const accordion = readSource("../components/faq/faq-accordion.tsx");

    assert.match(accordion, /if \(!items\.length\)/);
    assert.match(accordion, /return null/);
  });

  test("gallery aside skips FAQ block when there are no items", () => {
    const aside = readSource("../components/product/product-detail-content-sections.tsx");

    assert.match(aside, /const hasFaq = faqItems\.length > 0/);
    assert.match(aside, /\{hasFaq \?/);
  });
});

describe("FAQ inactive and duplicate filtering", () => {
  test("repository helpers exclude inactive items before storefront render", () => {
    assert.equal(toActiveFaqItem(faqItemRow({ is_active: false })), null);
  });

  test("mergeGlobalFaqCandidates deduplicates repeated items for storefront output", () => {
    const items = mergeGlobalFaqCandidates([
      {
        faqItemId: "shared",
        question: "Споделен въпрос",
        answer: "A",
        sortOrder: 20_000,
      },
      {
        faqItemId: "shared",
        question: "Споделен въпрос",
        answer: "B",
        sortOrder: 10_000,
      },
    ]);

    assert.equal(items.length, 1);
    assert.equal(items[0]?.id, "shared");
  });

  test("getProductFaqItems keeps resolver dedupe for individual and group FAQ", async () => {
    const productId = "prod-1";
    const sharedItem = faqItemRow({
      id: "shared-item",
      question: "Споделен",
      answer: "Отговор",
    });

    const supabase = {
      from(table: string) {
        if (table === "product_faq_items") {
          return {
            select: () => ({
              eq: () => ({
                order: async () => ({
                  data: [
                    {
                      sort_order: 0,
                      faq_items: sharedItem,
                    },
                  ],
                  error: null,
                }),
              }),
            }),
          };
        }

        if (table === "product_faq_groups") {
          return {
            select: () => ({
              eq: () => ({
                order: async () => ({
                  data: [
                    {
                      group_id: "group-1",
                      sort_order: 0,
                      faq_groups: { id: "group-1", is_active: true, scope: "product" },
                    },
                  ],
                  error: null,
                }),
              }),
            }),
          };
        }

        if (table === "faq_group_items") {
          return {
            select: () => ({
              in: () => ({
                order: async () => ({
                  data: [
                    {
                      group_id: "group-1",
                      sort_order: 0,
                      faq_items: sharedItem,
                    },
                  ],
                  error: null,
                }),
              }),
            }),
          };
        }

        throw new Error(`unexpected table ${table}`);
      },
    };

    const items = await getProductFaqItems(productId, supabase as never);
    assert.equal(items.length, 1);
    assert.equal(items[0]?.id, "shared-item");
  });

  test("storefront components do not ship hardcoded fallback FAQ copy", () => {
    const section = readSource("../components/faq/faq-section.tsx");
    const accordion = readSource("../components/faq/faq-accordion.tsx");

    assert.doesNotMatch(section, /fallback/i);
    assert.doesNotMatch(accordion, /fallback/i);
    assert.doesNotMatch(section, /defaultFaq/i);
    assert.doesNotMatch(accordion, /defaultFaq/i);
  });
});

describe("FAQ accordion accessibility", () => {
  test("question row is a button with expanded state and panel controls", () => {
    const accordion = readSource("../components/faq/faq-accordion.tsx");

    assert.match(accordion, /type="button"/);
    assert.match(accordion, /aria-expanded=\{isOpen\}/);
    assert.match(accordion, /aria-controls=\{panelId\}/);
    assert.match(accordion, /role="region"/);
    assert.match(accordion, /aria-labelledby=\{buttonId\}/);
    assert.match(accordion, /aria-hidden=\{!isOpen\}/);
  });

  test("accordion supports keyboard navigation between questions", () => {
    const accordion = readSource("../components/faq/faq-accordion.tsx");

    assert.match(accordion, /onKeyDown=/);
    assert.match(accordion, /ArrowDown/);
    assert.match(accordion, /ArrowUp/);
  });

  test("answers preserve line breaks and respect reduced motion", () => {
    const accordion = readSource("../components/faq/faq-accordion.tsx");

    assert.match(accordion, /withPlainTextClass/);
    assert.match(accordion, /motion-reduce:transition-none/);
  });
});

describe("FAQ storefront revalidation", () => {
  test("faq admin actions revalidate home and product detail routes", () => {
    const faqActions = readSource("../app/admin/faq-actions.ts");

    assert.match(faqActions, /revalidateGlobalFaqPaths\(\)/);
    assert.doesNotMatch(faqActions, /no-store/i);
  });

  test("revalidateGlobalFaqPaths covers home and product detail layouts", () => {
    const revalidate = readSource("../lib/faq/revalidate.ts");

    assert.match(revalidate, /revalidatePath\("\/"\)/);
    assert.match(revalidate, /revalidatePath\("\/products\/\[slug\]", "page"\)/);
    assert.match(revalidate, /revalidatePath\("\/produkti\/\[slug\]", "page"\)/);
  });

  test("product admin save still revalidates specific product paths", () => {
    const adminActions = readSource("../app/admin/actions.ts");

    assert.match(adminActions, /syncProductFaqAssociations/);
    assert.match(adminActions, /revalidateProductPaths\(supabase,id\)/);
    assert.match(adminActions, /revalidatePath\("\/"\)/);
  });

  test("revalidateGlobalFaqPaths is exported for admin FAQ mutations", () => {
    assert.equal(typeof revalidateGlobalFaqPaths, "function");
  });
});

describe("FAQ global scope isolation", () => {
  test("getGlobalFaqItems queries only active global groups", async () => {
    let scopeFilter = "";
    const supabase = {
      from(table: string) {
        if (table === "faq_groups") {
          return {
            select: () => ({
              eq: (column: string, value: string) => {
                if (column === "scope") {
                  scopeFilter = value;
                }
                return {
                  eq: () => ({
                    order: () => ({
                      order: async () => ({ data: [], error: null }),
                    }),
                  }),
                };
              },
            }),
          };
        }

        throw new Error(`unexpected table ${table}`);
      },
    };

    await getGlobalFaqItems(supabase as never);
    assert.equal(scopeFilter, "global");
  });
});
