import { existsSync, readFileSync } from "node:fs";

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
        const name = line.slice(0, separatorIndex).trim();
        const value = line.slice(separatorIndex + 1).trim();
        return [name, value];
      }),
  );
}

const localEnv = readLocalEnv();

const requiredVariables = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SECRET_KEY",
  "CHECKOUT_RATE_LIMIT_SECRET",
  "NEXT_PUBLIC_SITE_URL",
];

const missingVariables = requiredVariables.filter(
  (name) => !(process.env[name]?.trim() || localEnv[name]?.trim()),
);

if (missingVariables.length > 0) {
  console.error("Missing required environment variables:");
  missingVariables.forEach((name) => console.error(`- ${name}`));
  process.exitCode = 1;
} else {
  console.log("All required environment variables are configured.");
}
