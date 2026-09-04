import { Room } from "./Room";
import { guard } from "./gate";
import { getImage, putImage } from "./images";

export { Room };

type Env = {
  ROOMS: DurableObjectNamespace;
  ASSETS: Fetcher;
  /**
   * Optional. Set it and the whole deployment asks for it once per device;
   * leave it unset and the site is open. See worker/gate.ts for why absence
   * fails open rather than closed.
   */
  SITE_PASSPHRASE?: string;
  /**
   * Web Push. The private half is a secret; the public half is handed to every
   * browser that subscribes. Leave them unset and no phone is ever buzzed —
   * a deployment without keys sends nothing rather than failing at the moment
   * somebody's turn comes round.
   */
  VAPID_PUBLIC?: string;
  VAPID_PRIVATE?: string;
  /** Who a push service should complain to. A mailto: or an https: URL. */
  VAPID_SUBJECT?: string;
  /**
   * Pictures the table put there. Optional: unbound, every image route answers
   * politely and the cards fall back to the icon set — the same rule the push
   * keys follow. See worker/images.ts.
   */
  IMAGES?: R2Bucket;
};

/** The keys, or null when this deployment has none. All three or nothing. */
export const pushKeys = (env: Env) =>
  env.VAPID_PUBLIC !== undefined && env.VAPID_PRIVATE !== undefined && env.VAPID_SUBJECT !== undefined
    ? { publicKey: env.VAPID_PUBLIC, privateKey: env.VAPID_PRIVATE, subject: env.VAPID_SUBJECT }
    : null;

/** Six characters, no vowels, no look-alikes — it gets read out loud. */
const CODE = /^[BCDFGHJKLMNPQRSTVWXYZ23456789]{6}$/;

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    // Everything, including the assets and the room's socket, sits behind this.
    const gate = await guard(request, env.SITE_PASSPHRASE);
    if (gate.response) return gate.response;

    const url = new URL(request.url);

    /*
     * The public half, handed to any browser that wants to subscribe. Not a
     * secret — it is in every push message this deployment ever sends — but
     * ABSENT is meaningful: 404 tells the client the feature is off, which is
     * how the button knows not to appear.
     */
    if (url.pathname === "/push/key") {
      const keys = pushKeys(env);
      return keys === null
        ? new Response("push is not configured", { status: 404 })
        : new Response(keys.publicKey, {
            headers: { "content-type": "text/plain", "cache-control": "no-store" },
          });
    }

    /*
     * Campaign content, and so behind the gate — unlike `/gate/`'s own
     * artwork, which is decoration on a page that is already public. `guard`
     * has already run above; reaching this line means the cookie was good.
     */
    const image = /^\/images\/([0-9a-f]{64})$/.exec(url.pathname);
    if (image) {
      const id = image[1]!;
      if (request.method === "PUT") return putImage(request, env, id);
      if (request.method === "GET") return getImage(env, id);
      return new Response("method not allowed", { status: 405 });
    }

    const match = /^\/room\/([A-Z0-9]{6})$/.exec(url.pathname);
    if (match) {
      const code = match[1]!;
      if (!CODE.test(code)) return new Response("bad code", { status: 400 });
      /*
       * Namespaced, and it has to be from the cutover onward.
       *
       * A Durable Object namespace is identified by the SCRIPT name and the
       * class name, and at cutover this Worker took V1's script name. Both
       * classes are called `Room`, so `idFromName(code)` now resolves to the
       * same object V1 would have opened for that code — and both create a
       * table called `events` with `IF NOT EXISTS` and incompatible columns:
       *
       *   V1: events (seq INTEGER PRIMARY KEY AUTOINCREMENT, id TEXT UNIQUE, payload TEXT)
       *   V2: events (id TEXT PRIMARY KEY, seq INTEGER, body TEXT)
       *
       * So V2 opening a code V1 had used would find V1's table, skip its own
       * CREATE, and fail on the first insert — for that code only, which is
       * the worst shape of bug: it works everywhere except the room somebody
       * chose because they had used it before.
       *
       * The prefix is a one-line guarantee of a fresh object per code. It is
       * deliberately not a class rename: that needs a migration, and a
       * migration is the wrong thing to be executing during a cutover.
       */
      const id = env.ROOMS.idFromName(`v2:${code}`);
      return env.ROOMS.get(id).fetch(request);
    }
    return env.ASSETS.fetch(request);
  },
};
