/**
 * Pictures the table put there: a session's hero, an encounter's thumbnail, a
 * face for an NPC.
 *
 * **Why these cannot live in the log.** Everything else in this app is an
 * event: appended, replayed on every device, and undoable. That works because
 * events are small — a few hundred bytes of JSON. An image is four to six
 * orders of magnitude larger, and putting one in the log would push it through
 * the Durable Object's socket to every phone at the table on every replay, to
 * render one card. So the log carries an ID and the bytes live here.
 *
 * **Content-addressed.** The id IS the SHA-256 of the bytes, computed by the
 * client before upload. Three things fall out of that and each one is worth
 * the constraint:
 *
 *   - The same picture uploaded twice is stored once.
 *   - A stored object can never change, so it is cacheable forever — and a
 *     card that has drawn it once never fetches it again.
 *   - An "orphan" is exactly a key nothing in the log references, which makes
 *     cleaning up a set difference rather than a bookkeeping problem.
 *
 * **Behind the gate**, unlike `/gate/`'s own artwork. That art is decoration on
 * a login page which is already public; these are campaign content — a map of
 * the dungeon, a face the party has not met — and `worker/index.ts` calls
 * `guard` before it reaches any of this.
 *
 * **The bucket is optional.** With `IMAGES` unbound every route here answers
 * politely and the app runs: cards fall back to the icon set they already use.
 * That is not a courtesy to a misconfigured deploy, it is the same rule the
 * push keys follow — a deployment without a feature does without it rather
 * than failing at the moment somebody reaches for it.
 */

/** What a browser may send. Anything else is refused rather than stored. */
const ALLOWED = new Set(["image/webp", "image/jpeg", "image/png"]);

/**
 * 2MB, well past what the client should ever send.
 *
 * The client resizes before uploading, so this is not the real limit — it is
 * the backstop for a client that did not, and it exists because R2 will
 * happily accept a 40MB phone photo and then serve it to five people on a
 * pub's wifi.
 */
const MAX_BYTES = 2 * 1024 * 1024;

/** 64 lowercase hex characters: a SHA-256, and nothing else. */
const KEY = /^[0-9a-f]{64}$/;

export type ImageEnv = { IMAGES?: R2Bucket };

const off = () =>
  new Response("images are not configured", { status: 404, headers: { "cache-control": "no-store" } });

/**
 * Store one. The id must be the hash of the body, and that is CHECKED here
 * rather than trusted: a client that could name its own key could overwrite
 * somebody else's picture, and the whole immutability argument above rests on
 * a key meaning exactly one set of bytes.
 */
export async function putImage(request: Request, env: ImageEnv, id: string): Promise<Response> {
  if (env.IMAGES === undefined) return off();
  if (!KEY.test(id)) return new Response("bad id", { status: 400 });

  const type = request.headers.get("content-type") ?? "";
  if (!ALLOWED.has(type)) return new Response("unsupported type", { status: 415 });

  const body = await request.arrayBuffer();
  if (body.byteLength === 0) return new Response("empty", { status: 400 });
  if (body.byteLength > MAX_BYTES) return new Response("too large", { status: 413 });

  const digest = await crypto.subtle.digest("SHA-256", body);
  const actual = [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
  if (actual !== id) return new Response("id is not the hash of the body", { status: 400 });

  /* Already here means already correct — the key is the hash, so re-uploading
     the same picture is a no-op rather than a second write. */
  const had = await env.IMAGES.head(id);
  if (had === null) {
    await env.IMAGES.put(id, body, { httpMetadata: { contentType: type } });
  }
  return new Response(id, { status: 201, headers: { "cache-control": "no-store" } });
}

/**
 * Serve one.
 *
 * Immutable for a year: the bytes behind a key cannot change, so a device that
 * has drawn a card once never asks again — which is the difference between a
 * prep screen that loads instantly on a phone and one that refetches a dozen
 * thumbnails every time the DM opens the tab.
 */
export async function getImage(env: ImageEnv, id: string): Promise<Response> {
  if (env.IMAGES === undefined) return off();
  if (!KEY.test(id)) return new Response("bad id", { status: 400 });

  const got = await env.IMAGES.get(id);
  if (got === null) return new Response("no such image", { status: 404 });

  return new Response(got.body, {
    headers: {
      "content-type": got.httpMetadata?.contentType ?? "application/octet-stream",
      "cache-control": "public, max-age=31536000, immutable",
      etag: `"${id}"`,
    },
  });
}
