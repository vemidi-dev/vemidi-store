import { existsSync, readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

function readLocalEnv() {
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
const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL || localEnv.NEXT_PUBLIC_SUPABASE_URL;
const secretKey = process.env.SUPABASE_SECRET_KEY || localEnv.SUPABASE_SECRET_KEY;

if (!supabaseUrl || !secretKey) {
  console.error("Missing Supabase URL or secret key.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, secretKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const tableChecks = [
  ["products", "id"],
  ["categories", "id"],
  ["product_categories", "product_id"],
  ["product_images", "id"],
  ["product_option_groups", "id"],
  ["product_option_values", "id"],
  ["product_promotions", "id"],
  ["product_color_fields", "id"],
  ["product_personalization_fields", "id, price_delta"],
  ["wish_templates", "id"],
  ["orders", "id"],
  ["newsletter_subscribers", "id"],
  ["blog_posts", "id"],
  ["events", "id"],
  ["event_registrations", "id"],
  ["event_gallery_images", "id"],
];

const rpcChecks = [
  [
    "check_store_checkout_rate_limit",
    {
      p_client_key: "smoke-check",
      p_limit: 1,
      p_window_seconds: 1,
    },
    ["invalid_rate_limit_parameters"],
  ],
  [
    "create_store_order",
    {
      p_customer: {},
      p_delivery: {},
      p_items: [],
      p_note: null,
      p_idempotency_key: "00000000-0000-4000-8000-000000000000",
    },
    ["empty_order", "invalid_customer_name"],
  ],
  [
    "admin_duplicate_product",
    { p_product_id: "00000000-0000-4000-8000-000000000001" },
    ["admin_required", "product_not_found"],
  ],
  [
    "admin_import_product_images",
    {
      p_product_id: "00000000-0000-4000-8000-000000000001",
      p_images: [],
    },
    ["admin_required", "product_not_found"],
  ],
  [
    "admin_replace_product_gallery_image",
    {
      p_image_id: "00000000-0000-4000-8000-000000000002",
      p_image_url: "https://example.com/smoke-check.webp",
    },
    ["admin_required", "product_image_not_found"],
  ],
];

let failed = false;

for (const [table, column] of tableChecks) {
  const { error } = await supabase.from(table).select(column).limit(1);
  if (error) {
    failed = true;
    console.error(`Table check failed: ${table} - ${error.message}`);
  } else {
    console.log(`Table check passed: ${table}`);
  }
}

for (const [name, args, expectedErrorFragments = []] of rpcChecks) {
  const { error } = await supabase.rpc(name, args);
  const expectedError =
    error && expectedErrorFragments.some((fragment) => error.message.includes(fragment));

  if (error && !expectedError) {
    failed = true;
    console.error(`RPC check failed: ${name} - ${error.message}`);
  } else {
    console.log(`RPC check passed: ${name}`);
  }
}

if (failed) {
  process.exitCode = 1;
} else {
  console.log("Supabase smoke check passed.");
}
