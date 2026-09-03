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
};

/** Six characters, no vowels, no look-alikes — it gets read out loud. */
const CODE = /^[BCDFGHJKLMNPQRSTVWXYZ23456789]{6}$/;

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    // Everything, including the assets and the room's socket, sits behind this.
    const gate = await guard(request, env.SITE_PASSPHRASE);
    if (gate.response) return gate.response;

    const url = new URL(request.url);
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
