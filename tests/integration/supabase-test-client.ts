import { existsSync, readFileSync } from "node:fs";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

type SupabaseTestConfig = {
  url: string;
  secretKey: string;
};

function readLocalEnv(): Record<string, string> {
  if (!existsSync(".env.local")) {
    return {};
  }

  return Object.fromEntries(
    readFileSync(".env.local", "utf8")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#") && line.includes("="))
      .map((line) => {
        const separatorIndex = line.indexOf("=");
        return [
          line.slice(0, separatorIndex).trim(),
          line.slice(separatorIndex + 1).trim(),
        ];
      }),
  );
}

const localEnv = readLocalEnv();

export function getSupabaseTestConfig(): SupabaseTestConfig | null {
  const url =
    process.env.SUPABASE_TEST_URL ||
    process.env.SUPABASE_INTEGRATION_URL ||
    localEnv.SUPABASE_TEST_URL ||
    localEnv.SUPABASE_INTEGRATION_URL;
  const secretKey =
    process.env.SUPABASE_TEST_SECRET_KEY ||
    process.env.SUPABASE_INTEGRATION_SECRET_KEY ||
    localEnv.SUPABASE_TEST_SECRET_KEY ||
    localEnv.SUPABASE_INTEGRATION_SECRET_KEY;

  if (!url || !secretKey) {
    return null;
  }

  const productionUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL || localEnv.NEXT_PUBLIC_SUPABASE_URL;
  if (productionUrl && url === productionUrl) {
    throw new Error(
      "SUPABASE_TEST_URL matches NEXT_PUBLIC_SUPABASE_URL. Configure a separate test Supabase project.",
    );
  }

  return { url, secretKey };
}

export function getIntegrationSkipReason(): string | false {
  try {
    const config = getSupabaseTestConfig();
    if (!config) {
      return "SUPABASE_TEST_URL and SUPABASE_TEST_SECRET_KEY are not configured for an isolated test project.";
    }
    return false;
  } catch (error) {
    return error instanceof Error ? error.message : "Invalid Supabase test configuration.";
  }
}

export function createSupabaseTestClient(): SupabaseClient {
  const config = getSupabaseTestConfig();
  if (!config) {
    throw new Error("Missing Supabase test configuration.");
  }

  return createClient(config.url, config.secretKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export async function assertInventoryMigrationReady(supabase: SupabaseClient) {
  const { error } = await supabase
    .from("products")
    .select("id, fulfillment_type, stock_quantity")
    .limit(1);

  if (error?.message.includes("fulfillment_type")) {
    throw new Error(
      "Test Supabase is missing migration #35. Apply product_inventory_fulfillment.sql and #36 first.",
    );
  }

  if (error) {
    throw error;
  }
}
