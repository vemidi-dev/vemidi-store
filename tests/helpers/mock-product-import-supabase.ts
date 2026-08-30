import type { SupabaseClient } from "@supabase/supabase-js";

type CategoryRow = {
  id: string;
  slug: string;
  category_type: string;
};

type MockProductImportSupabaseOptions = {
  existingSlugs?: string[];
  categories?: CategoryRow[];
  createProductId?: string;
  attachErrorMessage?: string | null;
  updateError?: boolean;
  createErrorMessage?: string | null;
};

export function createMockProductImportSupabase(
  options: MockProductImportSupabaseOptions = {},
): SupabaseClient {
  const writes: string[] = [];

  const client = {
    writes,
    from(table: string) {
      return {
        select(columns: string) {
          return {
            in(column: string, values: string[]) {
              if (table === "products" && column === "slug") {
                const data = (options.existingSlugs ?? [])
                  .filter((slug) => values.includes(slug))
                  .map((slug) => ({ slug }));
                return Promise.resolve({ data, error: null });
              }

              if (table === "categories" && column === "slug") {
                const data = (options.categories ?? []).filter((category) =>
                  values.includes(category.slug),
                );
                return Promise.resolve({ data, error: null });
              }

              return Promise.resolve({ data: [], error: null });
            },
            eq() {
              return Promise.resolve({ data: null, error: null });
            },
          };
        },
        update(payload: Record<string, unknown>) {
          writes.push(`update:${table}:${JSON.stringify(payload)}`);
          return {
            eq() {
              return Promise.resolve({
                error: options.updateError ? { message: "update failed" } : null,
              });
            },
          };
        },
      };
    },
    rpc(name: string) {
      if (name === "admin_create_product_v11") {
        if (options.createErrorMessage) {
          return Promise.resolve({
            data: null,
            error: { message: options.createErrorMessage },
          });
        }
        return Promise.resolve({
          data: options.createProductId ?? "11111111-1111-4111-8111-111111111111",
          error: null,
        });
      }

      if (name === "admin_attach_product_images") {
        if (options.attachErrorMessage) {
          return Promise.resolve({
            data: null,
            error: { message: options.attachErrorMessage },
          });
        }
        return Promise.resolve({ data: null, error: null });
      }

      return Promise.resolve({ data: null, error: null });
    },
  };

  return client as unknown as SupabaseClient & { writes: string[] };
}
