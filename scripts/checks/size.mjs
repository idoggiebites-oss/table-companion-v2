import { walk, read } from "./util.mjs";

/* A hard number, because the split is obvious while you are in the file and
   invisible six weeks later. V1 reached 2,739 lines in one component. */
const BUDGETS = [
  { match: (f) => f.endsWith(".module.css"), max: 150, what: "CSS module" },
  /* A suite is a list of cases, not a design. It still has a ceiling — an
     enormous one is a module that needed splitting — but the ceiling is not
     the same number as a module's. */
  { match: (f) => f.endsWith(".test.ts") || f.endsWith(".test.tsx"), max: 450, what: "test suite" },
  { match: (f) => f.endsWith(".tsx"), max: 400, what: "component" },
  { match: (f) => f.endsWith(".ts") && !f.includes("__tests__"), max: 300, what: "domain module" },
];

export function run() {
  const failures = [];
  for (const f of walk("src", [".tsx", ".ts", ".css"])) {
    if (f.endsWith("tokens.css")) continue; // the one global sheet, by design
    const b = BUDGETS.find((x) => x.match(f));
    if (!b) continue;
    const n = read(f).split("\n").length;
    if (n > b.max) failures.push(`${f} is ${n} lines; the ${b.what} budget is ${b.max}`);
  }
  const globals = walk("src", [".css"]).filter((f) => !f.endsWith(".module.css") && !f.endsWith("tokens.css"));
  for (const g of globals) failures.push(`${g} is a global stylesheet; there is exactly one, and it is tokens.css`);
  return { name: "check-size", failures };
}
