import { walk, read, lineOf, rules } from "./util.mjs";
import { themes } from "./contrast.mjs";

export function run() {
  const failures = [];
  const cssFiles = walk("src", [".css"]);

  /* Does it parse at all?
     The tier-4 checks read every stylesheet and reported them clean while two
     carried a stray closing brace — the build was the only thing that noticed.
     A guard that opens a file should say when the file is broken. */
  for (const f of cssFiles) {
    const src = read(f).replace(/\/\*[\s\S]*?\*\//g, "");
    let depth = 0, at = 0;
    for (let i = 0; i < src.length; i++) {
      if (src[i] === "{") { depth++; if (depth === 1) at = i; }
      else if (src[i] === "}" && --depth < 0) {
        failures.push(`${f}:${lineOf(src, i)} has a closing brace that opens nothing`);
        depth = 0;
      }
    }
    if (depth > 0) failures.push(`${f}:${lineOf(src, at)} opens a block that is never closed`);
  }
  const defined = new Set();
  for (const f of cssFiles) for (const r of rules(read(f))) for (const k of Object.keys(r.decls)) defined.add(k);

  /* A var() that resolves to nothing is not a wrong value — it is no
     declaration at all, and CSS fails silently and whole. */
  for (const f of [...cssFiles, ...walk("src", [".tsx", ".ts"])]) {
    const src = read(f);
    for (const m of src.matchAll(/var\((--[\w-]+)/g)) {
      if (!defined.has(m[1])) failures.push(`${f}:${lineOf(src, m.index)} uses ${m[1]}, which is never defined`);
    }
  }

  /* The dark palette is written twice — once for the toggle, once for the
     system setting. A toggle that works while system-dark does not is the
     classic rot, so the two copies must be identical. */
  const { darkToggle, darkMedia } = themes(read("src/design/tokens.css"));
  const keys = new Set([...Object.keys(darkToggle), ...Object.keys(darkMedia)]);
  for (const k of keys) {
    if (darkToggle[k] !== darkMedia[k]) {
      failures.push(`tokens.css: ${k} differs between [data-theme="dark"] (${darkToggle[k] ?? "absent"}) and the prefers-color-scheme block (${darkMedia[k] ?? "absent"})`);
    }
  }
  return { name: "check-css", failures };
}
