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
});
