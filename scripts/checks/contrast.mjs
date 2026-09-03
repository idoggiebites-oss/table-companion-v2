import { read, rules } from "./util.mjs";

const hex = (h) => { h = h.trim().replace("#", ""); return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)); };
const lin = (c) => { c /= 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
const L = (h) => { const [r, g, b] = hex(h); return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b); };
export const ratio = (a, b) => { const [x, y] = [L(a), L(b)].sort((m, n) => n - m); return (x + 0.05) / (y + 0.05); };

/* Every pair the design actually puts on screen. Adding a colour token without
   adding it here is the thing that lets an unmeasured colour ship. */
const PAIRS = [
  ["--ink", "--canvas", 4.5], ["--ink", "--surface-1", 4.5], ["--ink", "--surface-2", 4.5],
  ["--ink-dim", "--canvas", 4.5], ["--ink-dim", "--surface-1", 4.5],
  ["--gold-ink", "--canvas", 4.5], ["--gold-ink", "--surface-1", 4.5],
  ["--on-gold", "--gold-fill", 4.5],
  ["--gold-edge", "--canvas", 3.0], ["--gold-edge", "--surface-1", 3.0],
  ["--damage", "--canvas", 4.5], ["--damage", "--surface-1", 4.5],
  ["--heal", "--canvas", 4.5], ["--heal", "--surface-1", 4.5],
  ["--injured", "--canvas", 4.5], ["--injured", "--surface-1", 4.5],
  ["--bloodied", "--canvas", 4.5], ["--bloodied", "--surface-1", 4.5],
  ["--concentration", "--canvas", 4.5], ["--concentration", "--surface-1", 4.5],
  ["--steel", "--canvas", 4.5], ["--steel", "--surface-1", 4.5],
  ["--ink", "--gold-wash", 4.5],
];

export function themes(css) {
  const rs = rules(css);
  const light = {};
  for (const r of rs) if (r.selector === ":root" && !r.at) Object.assign(light, r.decls);
  const darkToggle = {};
  for (const r of rs) if (r.selector === ':root[data-theme="dark"]') Object.assign(darkToggle, r.decls);
  const darkMedia = {};
  for (const r of rs) if (r.at.includes("prefers-color-scheme: dark")) Object.assign(darkMedia, r.decls);
  return { light, darkToggle, darkMedia, dark: { ...light, ...darkToggle } };
}

export function run() {
  const css = read("src/design/tokens.css");
  const { light, dark } = themes(css);
  const failures = [];
  for (const [name, sets] of [["light", light], ["dark", dark]]) {
    for (const [fg, bg, min] of PAIRS) {
      const a = sets[fg], b = sets[bg];
      if (!a || !b) { failures.push(`${name}: ${fg} on ${bg} — token not defined`); continue; }
      if (!a.startsWith("#") || !b.startsWith("#")) continue;
      const r = ratio(a, b);
      if (r < min) failures.push(`${name}: ${fg} ${a} on ${bg} ${b} is ${r.toFixed(2)}:1, needs ${min}:1`);
    }
  }
  return { name: "check-contrast", failures };
}
