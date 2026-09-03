#!/usr/bin/env node
/*
 * The compendium, locally, on its own port.
 *
 * It is not served by the app any more: 13,683 files in `dist/` is what makes
 * `wrangler dev` sit there and never answer, and the room tier runs against
 * the worker. So the compendium lives here in dev and in every test tier, and
 * on a published site in production. Same shape either way, so the only
 * difference between them is VITE_CONTENT_BASE.
 *
 * Deliberately tiny and dependency-free — it serves read-only JSON to
 * localhost and nothing else. Any request that escapes the content root is
 * refused rather than clamped, because a path traversal that quietly returns
 * the wrong file is worse than one that fails.
 */
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { join, normalize, resolve, extname } from "node:path";

const ROOT = resolve(process.argv[3] ?? "content-dist");
const PORT = Number(process.argv[2] ?? 4272);

const TYPES = { ".json": "application/json", ".txt": "text/plain" };

const server = createServer((req, res) => {
  void (async () => {
    /* Same-origin is not a thing here — the app is on another port, and in
       production on another host entirely. This server is localhost-only. */
    res.setHeader("access-control-allow-origin", "*");
    if (req.method === "OPTIONS") { res.writeHead(204).end(); return; }

    const path = decodeURIComponent(new URL(req.url ?? "/", "http://x").pathname);
    const target = resolve(join(ROOT, normalize(path)));
    if (target !== ROOT && !target.startsWith(ROOT + "/")) {
      res.writeHead(403).end("outside the content root");
      return;
    }
    try {
      if ((await stat(target)).isDirectory()) { res.writeHead(404).end("not a file"); return; }
      const body = await readFile(target);
      res.writeHead(200, {
        "content-type": TYPES[extname(target)] ?? "application/octet-stream",
        /* Immutable: the version is in the path, so a given URL's bytes never
           change. This is the header the published host cannot be told to
           send, and the reason a version in the path matters more there. */
        "cache-control": "public, max-age=31536000, immutable",
      }).end(body);
    } catch {
      res.writeHead(404).end("no such file");
    }
  })();
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`compendium on http://localhost:${String(PORT)} from ${ROOT}`);
});
