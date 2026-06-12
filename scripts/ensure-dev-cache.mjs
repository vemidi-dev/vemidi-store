import { existsSync, readdirSync, rmSync } from "node:fs";
import path from "node:path";

const nextDir = ".next-dev";
const devCssPath = path.join(nextDir, "static", "css", "app", "layout.css");
const prodCssDir = path.join(nextDir, "static", "css");

function hasProductionCssArtifacts() {
  if (!existsSync(prodCssDir)) {
    return false;
  }

  return readdirSync(prodCssDir, { withFileTypes: true }).some(
    (entry) => entry.isFile() && entry.name.endsWith(".css"),
  );
}

if (existsSync(nextDir) && hasProductionCssArtifacts() && !existsSync(devCssPath)) {
  console.log("Stale development cache detected. Cleaning .next-dev before dev...");
  rmSync(nextDir, { recursive: true, force: true });
}
