import {
  buildSmokeChecks,
  buildSmokeUrl,
  evaluateSmokeCheck,
  formatSmokeResultLine,
  parseSmokePaths,
  resolveSmokeBaseUrl,
} from "@/lib/smoke-preview/checks";

const DEFAULT_TIMEOUT_MS = 15_000;

async function fetchSmokeTarget(url: string, timeoutMs: number) {
  const response = await fetch(url, {
    method: "GET",
    redirect: "follow",
    headers: {
      Accept: "text/html,application/xml,text/plain,*/*",
      "User-Agent": "vemidi-preview-smoke/1.0",
    },
    signal: AbortSignal.timeout(timeoutMs),
  });

  const body = await response.text();
  return { status: response.status, body };
}

async function main() {
  const baseUrl = resolveSmokeBaseUrl(process.argv.slice(2));
  if (!baseUrl) {
    console.error(
      "Preview smoke requires a base URL via --base-url=https://preview-url.vercel.app or BASE_URL.",
    );
    process.exit(1);
  }

  const extraPaths = parseSmokePaths(process.env.SMOKE_PATHS);
  const checks = buildSmokeChecks(extraPaths);
  const failures: string[] = [];

  console.log(`Preview smoke against ${baseUrl}`);
  if (extraPaths.length > 0) {
    console.log(`Extra paths: ${extraPaths.join(", ")}`);
  }
  console.log("");

  for (const check of checks) {
    const url = buildSmokeUrl(baseUrl, check.path);

    try {
      const { status, body } = await fetchSmokeTarget(url, DEFAULT_TIMEOUT_MS);
      const result = evaluateSmokeCheck(check, status, body);
      console.log(formatSmokeResultLine(url, result));

      if (!result.ok) {
        failures.push(`${check.label}: ${result.detail}`);
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown request error.";
      console.log(`[FAIL] ${url} (${message})`);
      failures.push(`${check.label}: ${message}`);
    }
  }

  console.log("");
  if (failures.length > 0) {
    console.error(`Preview smoke: FAIL (${failures.length} issue(s))`);
    process.exit(1);
  }

  console.log(`Preview smoke: PASS (${checks.length} checks)`);
}

void main();
