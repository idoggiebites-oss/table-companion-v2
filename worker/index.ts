import { Room } from "./Room";

export { Room };

type Env = { ROOMS: DurableObjectNamespace; ASSETS: Fetcher };

/** Six characters, no vowels, no look-alikes — it gets read out loud. */
const CODE = /^[BCDFGHJKLMNPQRSTVWXYZ23456789]{6}$/;

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
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
