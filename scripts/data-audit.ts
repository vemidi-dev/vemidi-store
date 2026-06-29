import { existsSync, readFileSync } from "node:fs";

import { createClient } from "@supabase/supabase-js";

import { runDataAuditChecks } from "@/lib/data-audit/checks";
import { fetchAuditDataset } from "@/lib/data-audit/fetch";
import {
  formatAuditReport,
  hasCriticalIssues,
} from "@/lib/data-audit/report";

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

function resolveSupabaseConfig() {
  const localEnv = readLocalEnv();
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ||
    localEnv.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const secretKey =
    process.env.SUPABASE_SECRET_KEY?.trim() ||
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    localEnv.SUPABASE_SECRET_KEY?.trim() ||
    localEnv.SUPABASE_SERVICE_ROLE_KEY?.trim();

  return { url, secretKey };
}

async function main() {
  const { url, secretKey } = resolveSupabaseConfig();

  if (!url || !secretKey) {
    console.error(
      "Data audit requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY (or SUPABASE_SERVICE_ROLE_KEY).",
    );
    process.exit(1);
  }

  const supabase = createClient(url, secretKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  try {
    const dataset = await fetchAuditDataset(supabase);
    const report = runDataAuditChecks(dataset);
    console.log(formatAuditReport(report));
    process.exit(hasCriticalIssues(report.issues) ? 1 : 0);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown data audit error.";
    console.error(`Data audit failed: ${message}`);
    process.exit(1);
  }
}

void main();
