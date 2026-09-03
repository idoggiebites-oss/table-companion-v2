import { readdirSync, statSync, readFileSync } from "node:fs";
import { join } from "node:path";

export function walk(dir, exts) {
  const out = [];
  const visit = (d) => {
    for (const name of readdirSync(d)) {
      if (name === "node_modules" || name === ".git" || name === "dist") continue;
      const p = join(d, name);
      if (statSync(p).isDirectory()) visit(p);
      else if (exts.some((e) => name.endsWith(e))) out.push(p);
    }
  };
  try { visit(dir); } catch { /* absent dir is fine */ }
  return out;
}

export const read = (p) => readFileSync(p, "utf8");

/** Line number of a character offset. */
export const lineOf = (src, idx) => src.slice(0, idx).split("\n").length;

/** Minimal CSS walker: returns [{ selector, at, decls }]. Handles one level of @media. */
export function rules(css) {
  // Strip comments first: a comment sitting before a declaration otherwise
  // becomes part of that declaration's name, and the token silently vanishes.
  css = css.replace(/\/\*[\s\S]*?\*\//g, "");
  const out = [];
  let i = 0, buf = "", stack = [];
  while (i < css.length) {
    const c = css[i];
    if (c === "{") {
      stack.push(buf.trim());
      buf = "";
    } else if (c === "}") {
      const sel = stack.pop() ?? "";
      if (sel && !sel.startsWith("@")) {
        const decls = {};
        for (const part of buf.split(";")) {
          const k = part.indexOf(":");
          if (k === -1) continue;
          const name = part.slice(0, k).trim();
          if (name.startsWith("--")) decls[name] = part.slice(k + 1).trim();
        }
        out.push({ selector: sel, at: stack.find((s) => s.startsWith("@")) ?? "", decls });
      }
      buf = "";
    } else buf += c;
    i++;
  }
  return out;
}
