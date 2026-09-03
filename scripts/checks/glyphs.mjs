import { walk, read, lineOf } from "./util.mjs";

/* Icons are SVG. 17 of 39 candidate glyphs render as colour emoji somewhere,
   and four cannot be stopped at all.

   This MUST match \p{Extended_Pictographic} and never \p{Emoji} — \p{Emoji}
   matches all ten digits, `#` and `*`, so the naive version flags every number
   in an app whose entire subject is numbers, and then gets baselined away. */
const PICTO = /\p{Extended_Pictographic}/u;

export function run() {
  const failures = [];
  for (const f of walk("src", [".ts", ".tsx", ".css", ".html"])) {
    const src = read(f);
    for (const [i, ch] of [...src].entries()) {
      if (PICTO.test(ch)) {
        failures.push(`${f}:${lineOf(src, i)} contains ${JSON.stringify(ch)} (U+${ch.codePointAt(0).toString(16).toUpperCase()}) — icons are SVG`);
      }
    }
  }
  return { name: "check-glyphs", failures };
}
