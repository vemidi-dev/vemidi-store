import { rmSync } from "node:fs";

const cacheDirs = [".next", ".next-local", ".next-dev"];

for (const dir of cacheDirs) {
  rmSync(dir, { recursive: true, force: true });
  console.log(`Removed ${dir}`);
}
