#!/usr/bin/env node
/* Tier 4. Seven checks, each making a class of bug unwritable. */
import { run as css } from "./checks/css.mjs";
import { run as contrast } from "./checks/contrast.mjs";
import { run as inline } from "./checks/inline.mjs";
import { run as size } from "./checks/size.mjs";
import { run as locators } from "./checks/locators.mjs";
import { run as imports } from "./checks/imports.mjs";
import { run as glyphs } from "./checks/glyphs.mjs";
import { run as styles } from "./checks/styles.mjs";
import { run as keys } from "./checks/keys.mjs";

const checks = [css, contrast, inline, size, locators, imports, glyphs, styles, keys];
let bad = 0;

for (const c of checks) {
  const { name, failures } = c();
  if (failures.length === 0) {
    console.log(`  ok    ${name}`);
  } else {
    bad += failures.length;
    console.log(`  FAIL  ${name} — ${failures.length}`);
    for (const f of failures) console.log(`          ${f}`);
  }
}

if (bad) {
  console.log(`\ntier 4: ${bad} failure${bad === 1 ? "" : "s"}`);
  process.exit(1);
}
console.log("\ntier 4: clean");
