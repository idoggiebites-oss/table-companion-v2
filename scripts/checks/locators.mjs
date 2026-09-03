import { walk, read, lineOf } from "./util.mjs";

/* V1 had 26 selectors matching more than one component, because `.saved` was
   worn by five. Role and name first, data-testid second, CSS class never. */
export function run() {
  const failures = [];
  const files = [...walk("src", [".test.tsx", ".test.ts"]), ...walk("tests", [".ts", ".tsx", ".mjs"])];
  for (const f of files) {
    const src = read(f);
    for (const m of src.matchAll(/(locator|querySelector|querySelectorAll|\$\$?)\(\s*(['"`])([^'"`]*)\2/g)) {
      const sel = m[3];
      if (/(^|[\s>,+~])\.[A-Za-z_-]/.test(sel)) {
        failures.push(`${f}:${lineOf(src, m.index)} selects by CSS class: ${sel}`);
      }
    }
  }
  return { name: "check-locators", failures };
}
