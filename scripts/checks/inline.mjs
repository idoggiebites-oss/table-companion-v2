import { walk, read, lineOf } from "./util.mjs";

/* A literal size or colour in JSX is a value that is on no scale and in no
   theme. It belongs in a stylesheet, on the scale. */
export function run() {
  const failures = [];
  for (const f of walk("src", [".tsx"])) {
    const src = read(f);
    for (const m of src.matchAll(/style=\{\{([^}]*)\}\}/g)) {
      const body = m[1];
      if (/\d+(px|rem|em)\b/.test(body) || /#[0-9a-fA-F]{3,8}\b/.test(body) || /\b(rgb|hsl)a?\(/.test(body)) {
        failures.push(`${f}:${lineOf(src, m.index)} inline style carries a literal size or colour: ${body.trim().slice(0, 60)}`);
      }
    }
  }
  return { name: "check-inline", failures };
}
