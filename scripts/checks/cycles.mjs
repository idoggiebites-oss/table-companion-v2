import { walk, read, lineOf } from "./util.mjs";
import { dirname, join, normalize } from "node:path";
import { existsSync } from "node:fs";

/* No runtime import cycle inside src/.
 *
 * A cycle among VALUE imports means module init order decides who wins, and
 * which half wins depends on which file the program was entered through. That
 * is not a style problem: `model.ts` re-exported its own dependents, so
 * reaching the graph via `compendium.ts` left `NO_HERITAGE` still undefined
 * when `EMPTY` was built. `EMPTY.heritage` was silently `undefined` and stayed
 * that way, and nothing read it, so nothing complained.
 *
 * Type-only edges (`import type`, and specifiers marked `type`) are erased by
 * tsc and cannot do this, so they are deliberately NOT edges here. Counting
 * them reports two dozen harmless cycles and trains everyone to ignore the
 * check.
 */

/** Every `from "..."` statement, tagged with whether any VALUE crosses it. */
function* statements(src) {
  const re = /(?:^|\n)\s*(import|export)(\s+type)?\s*([^;]*?)\s*from\s*['"]([^'"]+)['"]/g;
  for (const m of src.matchAll(re)) {
    const [, , typeKeyword, clause, spec] = m;
    yield { spec, index: m.index, valued: !typeKeyword && hasValue(clause) };
  }
}

/** `{ a, type b }` carries a value; `{ type a, type b }` does not. */
function hasValue(clause) {
  const braced = clause.match(/\{([\s\S]*)\}/);
  if (!braced) return true; // default, namespace, or `export * from`
  const names = braced[1].split(",").map((s) => s.trim()).filter(Boolean);
  if (names.length === 0) return true; // `import {} from "m"` — side effect
  return names.some((n) => !/^type\s/.test(n));
}

function resolve(fromFile, spec) {
  if (!spec.startsWith(".")) return null;
  const base = normalize(join(dirname(fromFile), spec));
  for (const cand of [`${base}.ts`, `${base}.tsx`, join(base, "index.ts"), join(base, "index.tsx")]) {
    if (existsSync(cand)) return cand;
  }
  return null;
}

export function run() {
  const graph = new Map();
  const where = new Map();
  for (const f of walk("src", [".ts", ".tsx"])) {
    const src = read(f);
    const out = new Set();
    for (const s of statements(src)) {
      if (!s.valued) continue;
      const target = resolve(f, s.spec);
      if (target && target !== f) {
        out.add(target);
        if (!where.has(`${f}->${target}`)) where.set(`${f}->${target}`, lineOf(src, s.index));
      }
    }
    graph.set(f, out);
  }

  /* Tarjan: any strongly connected component with more than one file is a
     cycle. Reported once per component, not once per path through it. */
  const index = new Map(), low = new Map(), onStack = new Set(), stack = [];
  const components = [];
  let next = 0;
  const strongConnect = (v) => {
    index.set(v, next); low.set(v, next); next++;
    stack.push(v); onStack.add(v);
    for (const w of graph.get(v) ?? []) {
      if (!index.has(w)) { strongConnect(w); low.set(v, Math.min(low.get(v), low.get(w))); }
      else if (onStack.has(w)) low.set(v, Math.min(low.get(v), index.get(w)));
    }
    if (low.get(v) === index.get(v)) {
      const comp = [];
      let w;
      do { w = stack.pop(); onStack.delete(w); comp.push(w); } while (w !== v);
      if (comp.length > 1) components.push(comp);
    }
  };
  for (const v of graph.keys()) if (!index.has(v)) strongConnect(v);

  const failures = components.map((comp) => {
    const files = comp.slice().sort();
    const edges = [];
    for (const a of files) for (const b of graph.get(a) ?? []) {
      if (files.includes(b)) edges.push(`${a}:${where.get(`${a}->${b}`)} -> ${b}`);
    }
    return `runtime import cycle across ${files.length} files:\n      ${edges.join("\n      ")}`;
  });

  return { name: "check-cycles", failures };
}
