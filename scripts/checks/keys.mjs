import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

/**
 * A `key` must be written at the call site, never carried in a spread.
 *
 * React 19 deprecates `<X {...props} />` where `props` holds a key: it warns
 * today and will one day just stop, and when it stops it stops SILENTLY. What
 * it takes with it, in this app, is the step identity in creation — six steps
 * share one component, and without a key React keeps a single instance and the
 * choice made on the previous step with it. That shipped once: the lineage
 * stayed selected on the Class step, Continue was already enabled, and
 * pressing it recorded "hill-dwarf" as the character's class.
 *
 * Two things are checked, because either one alone can be worked around:
 *
 *   - No object literal that is spread into JSX declares a `key`. That is the
 *     React rule itself.
 *   - Within one file, a props object spread into JSX is keyed at EVERY call
 *     site or at none. Consistency rather than a blanket demand, because most
 *     spreads have no business carrying a key — the element is already keyed
 *     by its `map`, or it is the only one of its kind. What this catches is
 *     the seventeenth branch added beside sixteen keyed ones.
 */
const walk = (dir) => readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
  e.isDirectory() ? walk(join(dir, e.name)) : [join(dir, e.name)]);

export function run() {
  const failures = [];

  for (const file of walk("src").filter((f) => f.endsWith(".tsx"))) {
    const src = readFileSync(file, "utf8");

    /* Which names are spread into JSX at all: `{...common}` -> "common". */
    const spread = new Set(
      [...src.matchAll(/\{\s*\.\.\.\s*([A-Za-z_$][\w$]*)\s*\}/g)].map((m) => m[1]),
    );

    for (const name of spread) {
      /*
       * `const name = { ... }` — read to the line that closes it at the same
       * indent, which is how every props object in this codebase is written.
       */
      const decl = new RegExp(`^(\\s*)const ${name} = \\{$([\\s\\S]*?)^\\1\\};$`, "m").exec(src);
      if (decl !== null && /^\s*key:/m.test(decl[2])) {
        failures.push(
          `${file}: \`${name}\` declares a key and is spread into JSX — ` +
          `write \`key={...}\` at the call site instead`,
        );
      }

      /* Keyed everywhere, or nowhere. */
      const sites = [...src.matchAll(new RegExp(`\\{\\s*\\.\\.\\.\\s*${name}\\s*\\}`, "g"))]
        .map((m) => {
          const opens = src.slice(0, m.index).lastIndexOf("<");
          return {
            line: src.slice(0, m.index).split("\n").length,
            keyed: /\bkey=/.test(src.slice(opens, m.index)),
          };
        });
      if (sites.some((x) => x.keyed)) {
        for (const x of sites.filter((y) => !y.keyed)) {
          failures.push(
            `${file}:${x.line}: spreads \`${name}\` with no key, but ` +
            `${sites.filter((y) => y.keyed).length} other site(s) key it`,
          );
        }
      }
    }
  }

  return { name: "check-keys", failures };
}
