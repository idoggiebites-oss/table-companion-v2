#!/usr/bin/env node
/*
 * Stage one compiled compendium into a Pages site checkout.
 *
 * usage: node scripts/publish-content.mjs <path to the pages repo>
 *
 * It copies `content-dist/<version>/` in and stops. It does not commit, and it
 * does not push — publishing is yours to do, and a script that pushes on its
 * own initiative is a script that publishes something you had not looked at.
 *
 * A version already present is left ALONE rather than overwritten. The whole
 * point of a version in the path is that a given URL's bytes never change:
 * builds already out there go on asking for the compendium they were compiled
 * against, and overwriting it would reintroduce exactly the drift the version
 * exists to prevent. If you genuinely need to replace one, delete it by hand
 * and know what you are breaking.
 */
import { cpSync, existsSync, readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";

const dest = process.argv[2];
if (!dest) {
  console.error("usage: publish-content.mjs <path to the pages repo>");
  process.exit(2);
}
if (!existsSync("content-dist/version.json")) {
  console.error("no content-dist/version.json — run `npm run content` first");
  process.exit(2);
}

const { version } = JSON.parse(readFileSync("content-dist/version.json", "utf8"));
const from = resolve("content-dist", version);
const to = resolve(dest, version);

if (!existsSync(from)) {
  console.error(`content-dist/${version} is missing — run \`npm run content\``);
  process.exit(2);
}
if (existsSync(to)) {
  console.log(`${version} is already published there. Nothing to do.`);
  console.log("A published version is immutable on purpose — see the note in this file.");
  process.exit(0);
}

cpSync(from, to, { recursive: true });
const files = readdirSync(from, { recursive: true }).length;

console.log(`staged ${String(files)} files as ${version}`);
console.log("");
console.log("Now, in the pages repo:");
console.log(`  git add ${version} && git commit -m "compendium ${version}" && git push`);
console.log("");
console.log("Then build the app against it:");
console.log(`  VITE_CONTENT_BASE=https://<user>.github.io/<repo> npm run build`);
console.log("");
console.log("Old versions stay until nothing asks for them. Delete them later,");
console.log("not now — a device still running an older build is still fetching one.");
