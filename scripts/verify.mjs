#!/usr/bin/env node
/* The whole gate. Four tiers, in order, cheapest first.

   Two rules this file exists to enforce:
     1. Silence is not success. A tier that asserts nothing is a failure.
     2. Read the exit code, not the output. Nothing is piped through `tail`. */
import { spawnSync } from "node:child_process";
import { readFileSync, existsSync, mkdirSync, rmSync } from "node:fs";

const OUT = ".verify";
rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });

/* Minimums ratchet upward. A suite that quietly stops being collected is loud. */
const MINIMUMS = { domain: 597, component: 91, journey: 55 };

/* Tier 1 is meant to be instant. It reached 14.8s the day a 20MB compendium
   landed in `public/` and Vite began scanning it on every run.
   
   This WARNS; it does not fail. A wall-clock budget inside a correctness gate
   reports the machine, not the code: the same suite measured 0.5s on an idle
   laptop and 13.5s on a loaded one an hour later, and a gate that goes red
   because something else is compiling teaches people to ignore it. */
const SECONDS = { domain: 5 };

const sh = (cmd, args, env) => spawnSync(cmd, args, { stdio: "inherit", shell: false, env: { ...process.env, ...env } });

function step(label, cmd, args) {
  process.stdout.write(`\n── ${label}\n`);
  const r = sh(cmd, args);
  if (r.status !== 0) {
    console.error(`\nFAILED: ${label} (exit ${r.status})`);
    process.exit(1);
  }
}

function counted(label, key, cmd, args, parse) {
  process.stdout.write(`\n── ${label}\n`);
  const file = `${OUT}/${key}.json`;
  const r = sh(cmd, [...args, ...(key === "journey" ? [] : ["--outputFile", file])]);
  let n = 0;
  try {
    if (existsSync(file)) n = parse(JSON.parse(readFileSync(file, "utf8")));
  } catch { /* fall through to the count check */ }
  if (r.status !== 0) {
    console.error(`\nFAILED: ${label} (exit ${r.status})`);
    process.exit(1);
  }
  const budget = SECONDS[key];
  if (budget !== undefined) {
    let took = 0;
    try {
      const j = JSON.parse(readFileSync(file, "utf8"));
      const end = Math.max(...(j.testResults ?? []).map((r) => r.endTime ?? 0));
      took = (end - (j.startTime ?? end)) / 1000;
    } catch { /* the count check still applies */ }
    if (took > budget) {
      console.log(`   ${took.toFixed(1)}s — SLOW (budget ${budget}s). Check the machine first, then check`);
      console.log(`   what got scanned: a large public/ directory did this once already.`);
    } else if (took > 0) {
      console.log(`   ${took.toFixed(1)}s`);
    }
  }
  if (n < MINIMUMS[key]) {
    console.error(`\nFAILED: ${label} ran ${n} tests, minimum is ${MINIMUMS[key]}.`);
    console.error("Silence is not success — a tier that asserts nothing has not passed.");
    process.exit(1);
  }
  console.log(`   ${n} tests`);
}

step("typecheck", "npx", ["tsc", "--noEmit"]);
step("tier 4 · invariants", "node", ["scripts/check.mjs"]);
counted("tier 1 · domain", "domain", "npx",
  ["vitest", "run", "--project", "domain", "--reporter", "json"],
  (j) => j.numTotalTests ?? 0);
counted("tier 2 · component", "component", "npx",
  ["vitest", "run", "--project", "component", "--reporter", "json"],
  (j) => j.numTotalTests ?? 0);

if (process.env["SKIP_JOURNEY"]) {
  console.log("\n── tier 3 · journey  (skipped: SKIP_JOURNEY set)");
} else {
  process.stdout.write("\n── tier 3 · journey\n");
  const file = `${OUT}/journey.json`;
  const r = sh("npx", ["playwright", "test", "--reporter", "list,json"], { PLAYWRIGHT_JSON_OUTPUT_NAME: file });
  if (r.status !== 0) { console.error("\nFAILED: tier 3 (exit " + r.status + ")"); process.exit(1); }
  // The count is enforced here too. It was not, for four slices, and a
  // minimum of 15 sat happily above a suite of 14.
  let n = 0;
  try {
    const j = JSON.parse(readFileSync(file, "utf8"));
    n = (j.stats?.expected ?? 0) + (j.stats?.flaky ?? 0);
  } catch { /* the count check below is the failure */ }
  if (n < MINIMUMS.journey) {
    console.error(`\nFAILED: tier 3 ran ${n} tests, minimum is ${MINIMUMS.journey}.`);
    console.error("Silence is not success — a tier that asserts nothing has not passed.");
    process.exit(1);
  }
  console.log(`   ${n} tests`);
}

if (process.env["SKIP_JOURNEY"] || process.env["SKIP_ROOM"]) {
  console.log("\n── tier 3 · the room  (skipped)");
} else {
  process.stdout.write("\n── tier 3 · the room\n");
  // Its own config: a Durable Object and a real WebSocket, which the preview
  // cannot serve. An unrun suite is an unguarded claim.
  const r = sh("npx", ["playwright", "test", "-c", "playwright.room.config.ts", "--reporter", "line"]);
  if (r.status !== 0) { console.error("\nFAILED: the room (exit " + r.status + ")"); process.exit(1); }
}

console.log("\nverify: clean\n");
