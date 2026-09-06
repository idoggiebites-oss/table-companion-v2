import { describe, it, expect } from "vitest";
import { guard, tokenFor } from "./gate";

/*
 * The gate is the only security control in this codebase, and until this file
 * existed nothing asserted a word about it: the room tier passes either way,
 * because it boots with no passphrase and so exercises the open path only.
 * A control whose tests pass whether or not it works is not a tested control
 * — which is the same rule `verify.mjs` applies to whole tiers.
 *
 * `guard` is a pure function of a Request and a secret, so this needs no
 * server. Tier 1.
 */

const req = (path = "/", cookie?: string) =>
  new Request(`https://example.test${path}`, cookie === undefined ? {} : { headers: { cookie } });

const post = (body: string) =>
  new Request("https://example.test/unlock", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body,
  });

describe("the gate, when no passphrase is configured", () => {
  it("lets everything through", async () => {
    /* Deliberate, and V1's reason: a half-deployed gate that locks the table
       out of its own campaign mid-session is worse than an open one, and the
       absence of a secret is unambiguous. */
    expect((await guard(req("/"), undefined)).response).toBeUndefined();
    expect((await guard(req("/room/BCDFGH"), undefined)).response).toBeUndefined();
  });
});

describe("the gate, when a passphrase is configured", () => {
  const SECRET = "open-sesame";

  it("refuses a request that carries no cookie", async () => {
    const { response } = await guard(req("/"), SECRET);
    expect(response?.status).toBe(401);
  });

  it("refuses the app shell, not only the room", async () => {
    /* The whole point of `run_worker_first`. Without it the asset layer
       answers first and anybody can load the app unauthenticated. */
    for (const path of ["/", "/index.html", "/assets/index-abc123.js", "/icon-192.png"]) {
      expect((await guard(req(path), SECRET)).response?.status).toBe(401);
    }
  });

  it("answers the room in plain text, never an HTML login page", async () => {
    /* A fetch that expected a socket should not be handed a document. */
    const { response } = await guard(req("/room/BCDFGH"), SECRET);
    expect(response?.headers.get("content-type") ?? "").not.toContain("text/html");
  });

  it("lets a request through once it carries the right token", async () => {
    const token = await tokenFor(SECRET);
    expect((await guard(req("/", `tc_pass=${token}`), SECRET)).response).toBeUndefined();
  });

  it("refuses a wrong token, and a token for a different passphrase", async () => {
    expect((await guard(req("/", "tc_pass=nonsense"), SECRET)).response?.status).toBe(401);
    const other = await tokenFor("some-other-phrase");
    expect((await guard(req("/", `tc_pass=${other}`), SECRET)).response?.status).toBe(401);
  });

  it("stores a hash, never the passphrase itself", async () => {
    const token = await tokenFor(SECRET);
    expect(token).toMatch(/^[0-9a-f]{64}$/);
    expect(token).not.toContain(SECRET);
  });

  it("accepts the passphrase at /unlock and sets the cookie", async () => {
    const { response } = await guard(post(`passphrase=${encodeURIComponent(SECRET)}`), SECRET);
    const cookie = response?.headers.get("set-cookie") ?? "";
    expect(cookie).toContain(await tokenFor(SECRET));
    expect(cookie).not.toContain(SECRET);
    /* HttpOnly so script cannot read it; the gate is a door, not a session. */
    expect(cookie.toLowerCase()).toContain("httponly");
  });

  it("refuses the wrong passphrase at /unlock without setting anything", async () => {
    const { response } = await guard(post("passphrase=not-it"), SECRET);
    expect(response?.status).toBe(401);
    expect(response?.headers.get("set-cookie")).toBeNull();
  });

  it("lets its own artwork through, and nothing else", async () => {
    /*
     * The page draws a door, and it is shown to somebody who has not
     * authenticated — so `/gate/` has to be reachable without the cookie or
     * the gate answers its own <img> tags with the login page's HTML.
     *
     * It is the only hole, and it must stay the size of a picture: four
     * decorative files, no data, on a page that is already public.
     */
    const open = await guard(new Request("https://x/gate/door.webp"), "friend");
    expect(open.response).toBeUndefined();

    for (const path of ["/", "/index.html", "/gateway", "/gate", "/assets/app.js"]) {
      const shut = await guard(new Request(`https://x${path}`), "friend");
      expect(shut.response?.status, path).toBe(401);
    }
  });

  it("lets the service worker through, so a stale one can be replaced", async () => {
    /*
     * Not a convenience. V1 shipped a service worker at this same origin and
     * scope, and a worker's precached shell answers navigations from cache
     * without consulting the network — so that browser never reaches the gate,
     * never gets a cookie, and cannot fetch `/sw.js` to learn a newer worker
     * exists. The update it needs is behind the door it cannot open, and it
     * stays on the old build forever. Arturo hit it: "it still opens V1 even
     * with the current link."
     */
    for (const path of ["/sw.js", "/registerSW.js", "/push-sw.js", "/workbox-6c06881d.js"]) {
      const open = await guard(new Request(`https://x${path}`), "friend");
      expect(open.response, path).toBeUndefined();
    }
  });

  it("opens for the worker's own name and nothing shaped like it", async () => {
    /* The hole is a list of filenames, not a suffix: `/assets/sw.js` and
       `/sw.js.map` are not the service worker and do not get through. */
    for (const path of ["/assets/sw.js", "/sw.js.map", "/swat.js", "/workbox-.js", "/sw.json"]) {
      const shut = await guard(new Request(`https://x${path}`), "friend");
      expect(shut.response?.status, path).toBe(401);
    }
  });

  it("cannot be walked out of with a traversal", async () => {
    /* `new URL` normalises the path before we see it, so `..` never survives
       into the prefix test — asserted rather than assumed. */
    const out = await guard(new Request("https://x/gate/../secrets"), "friend");
    expect(out.response?.status).toBe(401);
  });
});
