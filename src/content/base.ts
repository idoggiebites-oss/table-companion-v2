/**
 * Where the compendium lives, and which build of it this app expects.
 *
 * The compendium is NOT shipped with the app. It is 13,683 files against the
 * app's own 130, which is what made `wrangler dev` unusable — it enumerates
 * every asset before answering, and measured, the cliff sits between 7,000
 * and 10,300 files. It also walks towards Cloudflare's hard 20,000-asset
 * deploy limit as the corpus grows. So it is published separately and fetched
 * from wherever `VITE_CONTENT_BASE` points.
 *
 * THE VERSION IN THE PATH IS THE POINT. Two separately-deployed halves can
 * drift: push the app that reads a new field and forget to push the content
 * that has it, and every item reads blank with nothing failing loudly. Worse,
 * the two halves are cached independently and for different lengths — the
 * host holds files for its own time, and this app's own service worker keeps
 * prose on a cache-first rule — so even two correct pushes seconds apart
 * leave a window where a device holds a new app and an old compendium.
 *
 * A version in the path removes the window rather than narrowing it. This
 * build asks for exactly the compendium it was compiled against; an older
 * build goes on asking for its own, which is still sitting there. Neither can
 * see the other's files, so there is no drift to manage — only old versions
 * to delete once nothing asks for them.
 */

/** Baked at build time from `content-dist/version.json`. See vite.config.ts. */
declare const __CONTENT_VERSION__: string;

export const CONTENT_VERSION: string =
  typeof __CONTENT_VERSION__ === "string" ? __CONTENT_VERSION__ : "dev";

/**
 * No trailing slash. Local dev and the test tiers point at the little static
 * server in `scripts/serve-content.mjs`; a deployed build points at the
 * published site.
 */
export const CONTENT_BASE: string =
  (import.meta.env["VITE_CONTENT_BASE"] as string | undefined) ?? "http://localhost:4272";

/**
 * `path` is relative to one compendium build — `index/spell.json`,
 * `describe/race/elf.json`. Always absolute in the result: `creatures.ts` used
 * to fetch `content/index/creature.json` with no leading slash, which resolves
 * against the current page and so asked for `/room/ABCDEF/content/...` the
 * moment a device was in a room.
 */
export const contentUrl = (path: string): string =>
  `${CONTENT_BASE}/${CONTENT_VERSION}/${path.replace(/^\/+/, "")}`;
