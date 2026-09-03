import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

/**
 * Every class a component names must exist in the stylesheet it imports.
 *
 * Splitting a stylesheet twice left classes behind: rows lost their layout and
 * ran two lines into one, and an armour warning meant to be small and red came
 * out large and black. Neither failed a test, neither failed the build, and
 * both were only visible in a screenshot.
 */
const walk = (dir) => readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
  e.isDirectory() ? walk(join(dir, e.name)) : [join(dir, e.name)]);

export function run() {
const files = walk("src").filter((f) => f.endsWith(".tsx"));
const failures = [];

for (const file of files) {
  const src = readFileSync(file, "utf8");
  const imp = /import\s+(\w+)\s+from\s+"(\.[^"]*\.module\.css)"/.exec(src);
  if (imp === null) continue;
  const [, alias, rel] = imp;
  const cssPath = join(file, "..", rel);
  let css;
  try { css = readFileSync(cssPath, "utf8"); } catch { continue; }
  const have = new Set([...css.matchAll(/\.([A-Za-z][\w-]*)/g)].map((m) => m[1]));
  const used = new Set([...src.matchAll(new RegExp(`\\b${alias}\\.([A-Za-z]\\w*)`, "g"))].map((m) => m[1]));
  for (const name of used) {
    if (!have.has(name)) failures.push(`${file} uses ${alias}.${name}, which ${rel} does not define`);
  }
}

  return { name: "check-styles", failures };
}
