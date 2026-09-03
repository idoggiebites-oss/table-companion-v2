import { walk, read, lineOf } from "./util.mjs";

/* The seam is enforced by the import graph, not by intention.
   core/ knows nothing about D&D; rules/ knows nothing about React. */
const RULES = [
  { from: "src/core/", forbid: /^\.\.\/(rules|features|content|ui)\//, why: "core/ must import nothing above it" },
  { from: "src/rules/", forbid: /(^react$|^react-dom|\.\.\/ui\/)/, why: "rules/ must not import React or UI" },
  // Activates in slice 2. The one-file licensing exit only holds if nothing
  // else reaches for it.
  // The one-file licensing exit only holds if nothing else reaches for it.
  { from: "src/", only: "non-srd", allowedIn: ["src/rules/5e/pointbuy.ts", "src/rules/5e/encounter.ts"], why: "only pointbuy.ts and encounter.ts may import the not-SRD tables" },
];

export function run() {
  const failures = [];
  for (const f of walk("src", [".ts", ".tsx"])) {
    const src = read(f);
    for (const m of src.matchAll(/(?:^|\n)\s*(?:import|export)[^;]*?from\s*['"]([^'"]+)['"]/g)) {
      const spec = m[1];
      for (const r of RULES) {
        if (!f.startsWith(r.from)) continue;
        if (r.forbid && r.forbid.test(spec)) {
          failures.push(`${f}:${lineOf(src, m.index)} imports ${spec} — ${r.why}`);
        }
        if (r.only && spec.includes(r.only) && !r.allowedIn.includes(f)) {
          failures.push(`${f}:${lineOf(src, m.index)} imports ${spec} — ${r.why}`);
        }
      }
    }
  }
  return { name: "check-imports", failures };
}
