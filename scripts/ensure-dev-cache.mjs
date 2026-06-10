import { existsSync, readdirSync, rmSync } from "node:fs";
import path from "node:path";

const nextDir = ".next";
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

function cleanNextCaches() {
  for (const dir of [".next", ".next-local", ".next-dev"]) {
    rmSync(dir, { recursive: true, force: true });
  }
}

if (existsSync(nextDir) && hasProductionCssArtifacts() && !existsSync(devCssPath)) {
  console.log("Stale production cache detected. Cleaning .next before dev...");
  cleanNextCaches();
}
