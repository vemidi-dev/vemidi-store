import assert from "node:assert/strict";
import { describe, test } from "node:test";

import {
  getFaqAssociationRpcErrorMessage,
  replaceFaqGroupItems,
  replaceProductFaqAssociations,
} from "@/lib/faq/association-rpc";
import { syncProductFaqAssociations } from "@/lib/faq/product-associations";

type RpcCall = {
  name: string;
  args: Record<string, unknown>;
};

function createRpcOnlySupabaseMock() {
  const calls: RpcCall[] = [];
  const tableCalls: string[] = [];

  const supabase = {
    rpc: async (name: string, args: Record<string, unknown>) => {
      calls.push({ name, args });
      return { error: null, data: null };
    },
    from: (table: string) => {
      tableCalls.push(table);
      return {
        delete: () => ({
          eq: async () => ({ error: new Error("client delete should not run") }),
        }),
        insert: async () => ({ error: new Error("client insert should not run") }),
        select: () => ({
          eq: () => ({
            order: async () => ({ data: [], error: null }),
          }),
        }),
      };
    },
  };

  return { supabase, calls, tableCalls };
}

describe("FAQ association RPC client", () => {
  test("replaceProductFaqAssociations calls atomic RPC with ordered arrays", async () => {
    const { supabase, calls, tableCalls } = createRpcOnlySupabaseMock();

    const error = await replaceProductFaqAssociations(supabase as never, "prod-1", ["g1", "g2"], [
      "i1",
    ]);

    assert.equal(error, null);
    assert.deepEqual(calls, [
      {
        name: "replace_product_faq_associations",
        args: {
          p_product_id: "prod-1",
          p_group_ids: ["g1", "g2"],
          p_item_ids: ["i1"],
        },
      },
    ]);
    assert.deepEqual(tableCalls, []);
  });

  test("replaceProductFaqAssociations accepts empty arrays for clearing links", async () => {
    const { supabase, calls } = createRpcOnlySupabaseMock();

    const error = await replaceProductFaqAssociations(supabase as never, "prod-1", [], []);

    assert.equal(error, null);
    assert.deepEqual(calls[0]?.args, {
      p_product_id: "prod-1",
      p_group_ids: [],
      p_item_ids: [],
    });
  });

  test("syncProductFaqAssociations does not use client-side junction deletes", async () => {
    const { supabase, calls, tableCalls } = createRpcOnlySupabaseMock();

    const error = await syncProductFaqAssociations(supabase as never, "prod-1", {
      groupIds: ["g1"],
      itemIds: [],
    });

    assert.equal(error, null);
    assert.equal(calls.length, 1);
    assert.equal(calls[0]?.name, "replace_product_faq_associations");
    assert.deepEqual(tableCalls, []);
  });

  test("replaceFaqGroupItems calls atomic RPC and skips client delete/insert", async () => {
    const { supabase, calls, tableCalls } = createRpcOnlySupabaseMock();

    const error = await replaceFaqGroupItems(supabase as never, "group-1", ["i1", "i2"]);

    assert.equal(error, null);
    assert.deepEqual(calls, [
      {
        name: "replace_faq_group_items",
        args: {
          p_group_id: "group-1",
          p_item_ids: ["i1", "i2"],
        },
      },
    ]);
    assert.deepEqual(tableCalls, []);
  });

  test("getFaqAssociationRpcErrorMessage maps global group rejection", () => {
    assert.equal(
      getFaqAssociationRpcErrorMessage({
        code: "22023",
        message: "invalid_product_faq_group",
        details: "",
        hint: "",
      }),
      "Само активни продуктови FAQ групи могат да се свързват с продукт.",
    );
  });

  test("getFaqAssociationRpcErrorMessage maps missing migration", () => {
    assert.match(
      getFaqAssociationRpcErrorMessage({
        code: "PGRST202",
        message: "Could not find the function public.replace_product_faq_associations",
        details: "",
        hint: "",
      }),
      /faq_admin_association_rpcs\.sql/,
    );
  });

  test("replaceProductFaqAssociations surfaces RPC validation failures without local deletes", async () => {
    const calls: RpcCall[] = [];
    const supabase = {
      rpc: async (name: string, args: Record<string, unknown>) => {
        calls.push({ name, args });
        return {
          error: {
            code: "22023",
            message: "invalid_product_faq_group",
            details: "",
            hint: "",
          },
        };
      },
      from: () => {
        throw new Error("client delete should not run");
      },
    };

    const error = await replaceProductFaqAssociations(supabase as never, "prod-1", ["global"], []);

    assert.match(error ?? "", /продуктови FAQ групи/);
    assert.equal(calls.length, 1);
  });
});
