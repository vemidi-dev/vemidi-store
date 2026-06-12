import { createRequire } from "node:module";

import type sharp from "sharp";

const require = createRequire(import.meta.url);

let cached: typeof sharp | null = null;

/** Load sharp via Node resolution (avoids broken dynamic import in Next dev on Windows). */
export function loadSharp(): typeof sharp {
  if (!cached) {
    cached = require("sharp") as typeof sharp;
  }
  return cached;
}
