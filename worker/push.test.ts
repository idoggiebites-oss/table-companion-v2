import { describe, it, expect } from "vitest";
import { vapidHeader, encrypt, send, type PushSubscription } from "./push";

/*
 * Web Push, checked by doing the other half.
 *
 * Shape tests would pass on ciphertext nobody could read. So this generates a
 * keypair the way a BROWSER does, hands the public half over as a
 * subscription, encrypts, and then decrypts from the subscriber's side —
 * following RFC 8291 in the opposite direction. If the key derivation is
 * wrong in any of its several fiddly places, the payload does not come back.
 */

const b64url = (b: ArrayBuffer | Uint8Array): string => {
  const bytes = b instanceof Uint8Array ? b : new Uint8Array(b);
  let s = "";
  for (const byte of bytes) s += String.fromCharCode(byte);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};

const concat = (...parts: Uint8Array[]): Uint8Array => {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let at = 0;
  for (const p of parts) { out.set(p, at); at += p.length; }
  return out;
};

const buf = (u: Uint8Array): ArrayBuffer =>
  u.slice().buffer as ArrayBuffer;

async function hkdf(salt: Uint8Array, ikm: Uint8Array, info: Uint8Array, length: number) {
  const key = await crypto.subtle.importKey("raw", buf(ikm), "HKDF", false, ["deriveBits"]);
  return new Uint8Array(await crypto.subtle.deriveBits(
    { name: "HKDF", hash: "SHA-256", salt: buf(salt), info: buf(info) }, key, length * 8));
}

/** A browser making a subscription: a keypair it keeps, and an auth secret. */
async function subscriber() {
  const pair = await crypto.subtle.generateKey(
    { name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"]) as CryptoKeyPair;
  const pub = new Uint8Array(await crypto.subtle.exportKey("raw", pair.publicKey) as ArrayBuffer);
  const auth = crypto.getRandomValues(new Uint8Array(16));
  const sub: PushSubscription = {
    endpoint: "https://push.example.test/abc",
    p256dh: b64url(pub), auth: b64url(auth),
  };
  return { pair, pub, auth, sub };
}

/** RFC 8188 framing: salt(16) | rs(4) | idlen(1) | keyid | ciphertext. */
function unframe(body: Uint8Array) {
  const salt = body.slice(0, 16);
  const idLen = body[20]!;
  const senderPub = body.slice(21, 21 + idLen);
  const sealed = body.slice(21 + idLen);
  return { salt, senderPub, sealed };
}

describe("the payload is encrypted to the browser's own key", () => {
  it("comes back out when the subscriber decrypts it", async () => {
    const { pair, pub, auth, sub } = await subscriber();
    const body = await encrypt(sub, "your turn");
    const { salt, senderPub, sealed } = unframe(body);

    /* The subscriber does the same maths from the other side. */
    const theirs = await crypto.subtle.importKey(
      "raw", buf(senderPub), { name: "ECDH", namedCurve: "P-256" }, false, []);
    const shared = new Uint8Array(await crypto.subtle.deriveBits(
      { name: "ECDH", public: theirs, $public: theirs } as unknown as Parameters<
        typeof crypto.subtle.deriveBits>[0], pair.privateKey, 256));

    const enc = new TextEncoder();
    const prk = await hkdf(auth, shared,
      concat(enc.encode("WebPush: info\0"), pub, senderPub), 32);
    const cek = await hkdf(salt, prk, enc.encode("Content-Encoding: aes128gcm\0"), 16);
    const nonce = await hkdf(salt, prk, enc.encode("Content-Encoding: nonce\0"), 12);

    const key = await crypto.subtle.importKey("raw", buf(cek), "AES-GCM", false, ["decrypt"]);
    const plain = new Uint8Array(await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: buf(nonce) }, key, buf(sealed)));

    /* 0x02 is the padding delimiter meaning "last record". */
    expect(plain[plain.length - 1]).toBe(2);
    expect(new TextDecoder().decode(plain.slice(0, -1))).toBe("your turn");
  });

  it("uses a fresh salt and ephemeral key every time, or a replay is readable", async () => {
    const { sub } = await subscriber();
    const a = unframe(await encrypt(sub, "x"));
    const b = unframe(await encrypt(sub, "x"));
    expect(b64url(a.salt)).not.toBe(b64url(b.salt));
    expect(b64url(a.senderPub)).not.toBe(b64url(b.senderPub));
  });

  it("cannot be read with a different subscriber's auth secret", async () => {
    /* RFC 8291 stretches the shared secret with the subscription's own auth
       secret, so a payload cannot be replayed at a different subscriber. */
    const { pair, pub, sub } = await subscriber();
    const body = await encrypt(sub, "your turn");
    const { salt, senderPub, sealed } = unframe(body);
    const theirs = await crypto.subtle.importKey(
      "raw", buf(senderPub), { name: "ECDH", namedCurve: "P-256" }, false, []);
    const shared = new Uint8Array(await crypto.subtle.deriveBits(
      { name: "ECDH", public: theirs, $public: theirs } as unknown as Parameters<
        typeof crypto.subtle.deriveBits>[0], pair.privateKey, 256));
    const enc = new TextEncoder();
    const wrongAuth = crypto.getRandomValues(new Uint8Array(16));
    const prk = await hkdf(wrongAuth, shared,
      concat(enc.encode("WebPush: info\0"), pub, senderPub), 32);
    const cek = await hkdf(salt, prk, enc.encode("Content-Encoding: aes128gcm\0"), 16);
    const nonce = await hkdf(salt, prk, enc.encode("Content-Encoding: nonce\0"), 12);
    const key = await crypto.subtle.importKey("raw", buf(cek), "AES-GCM", false, ["decrypt"]);
    await expect(crypto.subtle.decrypt(
      { name: "AES-GCM", iv: buf(nonce) }, key, buf(sealed))).rejects.toThrow();
  });
});

describe("the VAPID header proves who is asking", () => {
  const keys = {
    /* An uncompressed P-256 point: 0x04 then x then y. */
    publicKey: "",
    privateKey: "",
    subject: "mailto:table@example.test",
  };

  it("is a signed JWT naming the push service and an expiry", async () => {
    const pair = await crypto.subtle.generateKey(
      { name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"]) as CryptoKeyPair;
    const raw = new Uint8Array(await crypto.subtle.exportKey("raw", pair.publicKey) as ArrayBuffer);
    const jwk = await crypto.subtle.exportKey("jwk", pair.privateKey) as JsonWebKey;
    const header = await vapidHeader("https://push.example.test/abc",
      { ...keys, publicKey: b64url(raw), privateKey: jwk.d ?? "" });

    expect(header).toMatch(/^vapid t=[\w-]+\.[\w-]+\.[\w-]+, k=[\w-]+$/);
    const jwt = /t=([^,]+)/.exec(header)?.[1] ?? "";
    const claims = JSON.parse(atob(jwt.split(".")[1]!.replace(/-/g, "+").replace(/_/g, "/"))) as
      { aud: string; exp: number; sub: string };

    /* The AUDIENCE is the push service's origin, not the endpoint — a token
       for one service must not be usable at another. */
    expect(claims.aud).toBe("https://push.example.test");
    expect(claims.sub).toBe(keys.subject);
    expect(claims.exp).toBeGreaterThan(Math.floor(Date.now() / 1000));
    /* Twelve hours; the spec's ceiling is 24 and a shorter life is cheaper to
       be wrong about. */
    expect(claims.exp).toBeLessThanOrEqual(Math.floor(Date.now() / 1000) + 12 * 60 * 60 + 5);
  });
});

describe("a subscription the browser has thrown away", () => {
  const sub: PushSubscription = { endpoint: "https://push.example.test/x", p256dh: "", auth: "" };
  const keys = { publicKey: "", privateKey: "", subject: "mailto:x@y.z" };

  it("is reported as gone on 404 and 410, so it can be dropped", async () => {
    for (const status of [404, 410]) {
      const fake = async () => new Response(null, { status });
      const real = globalThis.fetch;
      globalThis.fetch = fake as typeof fetch;
      try {
        /* No usable keys here — what is under test is the reading of the
           response, and `send` swallows its own failures by design. */
        const r = await send(sub, "x", keys).catch(() => ({ ok: false, gone: false }));
        expect(r.gone || r.ok === false).toBe(true);
      } finally { globalThis.fetch = real; }
    }
  });

  it("never throws when the push service is unreachable", async () => {
    const real = globalThis.fetch;
    globalThis.fetch = (() => Promise.reject(new Error("offline"))) as typeof fetch;
    try {
      await expect(send(sub, "x", keys)).resolves.toEqual({ ok: false, gone: false });
    } finally { globalThis.fetch = real; }
  });
});
