import { Room } from "./Room";
import { guard } from "./gate";

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

    const match = /^\/room\/([A-Z0-9]{6})$/.exec(url.pathname);
    if (match) {
      const code = match[1]!;
      if (!CODE.test(code)) return new Response("bad code", { status: 400 });
      const id = env.ROOMS.idFromName(code);
      return env.ROOMS.get(id).fetch(request);
    }
    return env.ASSETS.fetch(request);
  },
};
