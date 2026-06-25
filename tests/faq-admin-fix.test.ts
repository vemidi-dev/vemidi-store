import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, test } from "node:test";

import { getFaqGroupMutationErrorMessage } from "@/lib/admin/faq-errors";
import { parseFaqGroupForm } from "@/lib/admin/faq-form";
import { adminFormFields } from "@/lib/admin/form-fields";
import { normalizeFaqScopeFilter } from "@/lib/admin/params";
import {
  findFaqItemByNormalizedQuestion,
  linkFaqItemToGroup,
  normalizeFaqQuestion,
} from "@/lib/faq/admin-items";

function makeForm(entries: Record<string, string | string[]>) {
  const formData = new FormData();
  Object.entries(entries).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      value.forEach((item) => formData.append(key, item));
    } else {
      formData.set(key, value);
    }
  });
  return formData;
}

describe("FAQ group scope persistence", () => {
  test("parseFaqGroupForm preserves product scope from hidden field", () => {
    const result = parseFaqGroupForm(
      makeForm({
        [adminFormFields.faq.groupName]: "Продуктова група",
        [adminFormFields.faq.groupSlug]: "produktova-grupa-test",
        [adminFormFields.faq.groupScope]: "product",
      }),
    );

    assert.equal(result.error, null);
    assert.equal(result.scope, "product");
  });

  test("normalizeFaqScopeFilter restores product tab after redirect", () => {
    assert.equal(normalizeFaqScopeFilter("product"), "product");
    assert.equal(normalizeFaqScopeFilter("global"), "global");
    assert.equal(normalizeFaqScopeFilter(""), "global");
  });
});

describe("FAQ duplicate question handling", () => {
  test("normalizeFaqQuestion trims and lowercases", () => {
    assert.equal(
      normalizeFaqQuestion("  Може ли пликът?  "),
      "може ли пликът?",
    );
  });

  test("findFaqItemByNormalizedQuestion matches case-insensitive duplicates", () => {
    const existing = findFaqItemByNormalizedQuestion(
      [
        { id: "item-1", question: "Колко време отнема?" },
        { id: "item-2", question: "Друг въпрос" },
      ],
      "  колко време отнема? ",
    );

    assert.equal(existing?.id, "item-1");
  });

  test("linkFaqItemToGroup returns already_linked for duplicate association", async () => {
    const supabase = {
      from(table: string) {
        if (table === "faq_group_items") {
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  maybeSingle: async () => ({ data: { group_id: "g1" } }),
                }),
              }),
            }),
          };
        }
        throw new Error(`unexpected table ${table}`);
      },
    };

    const result = await linkFaqItemToGroup(supabase as never, "g1", "item-1");
    assert.equal(result, "already_linked");
  });

  test("linkFaqItemToGroup inserts when association is new", async () => {
    let inserted = false;
    const supabase = {
      from(table: string) {
        if (table === "faq_group_items") {
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  maybeSingle: async () => ({ data: null }),
                }),
                order: () => ({
                  limit: () => ({
                    maybeSingle: async () => ({ data: { sort_order: 0 } }),
                  }),
                }),
              }),
            }),
            insert: async () => {
              inserted = true;
              return { error: null };
            },
          };
        }
        throw new Error(`unexpected table ${table}`);
      },
    };

    const result = await linkFaqItemToGroup(supabase as never, "g1", "item-2");
    assert.equal(result, "linked");
    assert.equal(inserted, true);
  });
});

describe("FAQ group mutation errors", () => {
  test("getFaqGroupMutationErrorMessage surfaces RLS errors clearly", () => {
    const message = getFaqGroupMutationErrorMessage(
      {
        code: "42501",
        message: "new row violates row-level security policy for table faq_groups",
        details: "",
        hint: "",
      },
      "create",
    );

    assert.match(message, /права за запис/i);
    assert.doesNotMatch(message, /^Групата не беше създадена\.$/);
  });
});

describe("faq_items_unique_question migration", () => {
  const sql = readFileSync("supabase/faq_items_unique_question.sql", "utf8");

  test("migration blocks unique index when duplicates exist", () => {
    assert.match(sql, /faq_items_duplicate_questions_exist/);
    assert.match(sql, /group by lower\(btrim\(question\)\)/);
    assert.match(sql, /having count\(\*\) > 1/);
  });

  test("migration does not delete or merge rows", () => {
    assert.doesNotMatch(sql, /delete from public\.faq_items/i);
    assert.doesNotMatch(sql, /update public\.faq_items/i);
  });
});
