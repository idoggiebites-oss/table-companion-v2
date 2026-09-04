import { describe, it, expect } from "vitest";
import { getImage, putImage, type ImageEnv } from "./images";

const bytes = (s: string) => new TextEncoder().encode(s);
const sha = async (b: Uint8Array) => {
  const d = await crypto.subtle.digest("SHA-256", b as unknown as ArrayBuffer);
  return [...new Uint8Array(d)].map((x) => x.toString(16).padStart(2, "0")).join("");
};
const put = (id: string, body: Uint8Array, type = "image/webp") =>
  new Request(`https://x/images/${id}`, { method: "PUT", body: body as unknown as BodyInit, headers: { "content-type": type } });

/** Enough of R2 to hold bytes and hand them back. */
const bucket = () => {
  const store = new Map<string, { body: Uint8Array; type: string }>();
  return {
    store,
    IMAGES: {
      head: async (k: string) => (store.has(k) ? {} : null),
      put: async (k: string, b: ArrayBuffer, o?: { httpMetadata?: { contentType?: string } }) => {
        store.set(k, { body: new Uint8Array(b), type: o?.httpMetadata?.contentType ?? "" });
      },
      get: async (k: string) => {
        const had = store.get(k);
        return had === undefined ? null : { body: had.body, httpMetadata: { contentType: had.type } };
      },
    } as unknown as R2Bucket,
  };
};

describe("storing a picture", () => {
  it("takes one, and names it by its own hash", async () => {
    const b = bytes("a map of the keep");
    const id = await sha(b);
    const env = bucket();
    expect((await putImage(put(id, b), env, id)).status).toBe(201);
    expect(env.store.has(id)).toBe(true);
  });

  it("refuses an id that is not the hash of the body", async () => {
    /*
     * Checked rather than trusted. A client that could name its own key could
     * overwrite somebody else's picture — and the whole reason these are
     * cacheable forever is that a key means exactly one set of bytes.
     */
    const b = bytes("a map of the keep");
    const wrong = await sha(bytes("something else"));
    const env = bucket();
    const res = await putImage(put(wrong, b), env, wrong);
    expect(res.status).toBe(400);
    expect(env.store.size).toBe(0);
  });

  it("stores the same picture once, however many times it arrives", async () => {
    const b = bytes("one picture");
    const id = await sha(b);
    const env = bucket();
    await putImage(put(id, b), env, id);
    await putImage(put(id, b), env, id);
    expect(env.store.size).toBe(1);
  });

  it("refuses anything that is not a picture, and anything enormous", async () => {
    const b = bytes("not an image");
    const id = await sha(b);
    expect((await putImage(put(id, b, "application/pdf"), bucket(), id)).status).toBe(415);

    const huge = new Uint8Array(2 * 1024 * 1024 + 1);
    const hugeId = await sha(huge);
    expect((await putImage(put(hugeId, huge), bucket(), hugeId)).status).toBe(413);
  });

  it("refuses a key that is not a hash at all", async () => {
    const b = bytes("x");
    expect((await putImage(put("../secrets", b), bucket(), "../secrets")).status).toBe(400);
  });
});

describe("serving one", () => {
  it("hands it back with its own type, cacheable forever", async () => {
    /* The bytes behind a key cannot change, so a device that has drawn a card
       once never asks again. */
    const b = bytes("a map");
    const id = await sha(b);
    const env = bucket();
    await putImage(put(id, b), env, id);

    const res = await getImage(env, id);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("image/webp");
    expect(res.headers.get("cache-control")).toContain("immutable");
    expect(res.headers.get("etag")).toBe(`"${id}"`);
  });

  it("says so plainly when there is no such picture", async () => {
    expect((await getImage(bucket(), await sha(bytes("never stored")))).status).toBe(404);
  });
});

describe("with no bucket bound at all", () => {
  it("answers politely rather than throwing, on both routes", async () => {
    /*
     * The same rule the push keys follow: a deployment without a feature does
     * without it, rather than failing at the moment somebody reaches for it.
     * The cards fall back to the icon set they already use.
     */
    const none: ImageEnv = {};
    const b = bytes("x");
    const id = await sha(b);
    expect((await putImage(put(id, b), none, id)).status).toBe(404);
    expect((await getImage(none, id)).status).toBe(404);
  });
});
