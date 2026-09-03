import { afterEach, describe, expect, it } from "vitest";
import { openLog } from "./persist";
import { asDevice } from "./types";

/**
 * Real IndexedDB, not a polyfill — this is component tier (real Chromium) on
 * purpose. Domain tier runs under Node, which has no `indexedDB` global at
 * all, so a collision this specific has to be proven against the real thing.
 */

const V1_DB = "table-companion";
const cleanup: string[] = [];
afterEach(async () => {
  await Promise.all(cleanup.splice(0).map((name) => new Promise<void>((res) => {
    const req = indexedDB.deleteDatabase(name);
    req.onsuccess = req.onerror = () => res();
  })));
});

/** V1's shape: `table-companion` at version 2, stores `log` + `meta`. */
function seedV1(): Promise<void> {
  cleanup.push(V1_DB);
  return new Promise((res, rej) => {
    const req = indexedDB.open(V1_DB, 2);
    req.onupgradeneeded = () => {
      req.result.createObjectStore("log", { keyPath: "byEventId" });
      req.result.createObjectStore("meta");
    };
    req.onsuccess = () => {
      const tx = req.result.transaction("meta", "readwrite");
      tx.objectStore("meta").put("a-v1-marker", "campaign");
      tx.oncomplete = () => { req.result.close(); res(); };
      tx.onerror = () => rej(tx.error);
    };
    req.onerror = () => rej(req.error);
  });
}

/** Reads V1's marker back, to prove V1's database was never touched. */
function readV1Marker(): Promise<unknown> {
  return new Promise((res, rej) => {
    const req = indexedDB.open(V1_DB, 2);
    req.onupgradeneeded = () => rej(new Error("V1's database should already exist at version 2"));
    req.onsuccess = () => {
      const tx = req.result.transaction("meta", "readonly");
      const get = tx.objectStore("meta").get("campaign");
      get.onsuccess = () => { req.result.close(); res(get.result); };
      get.onerror = () => rej(get.error);
    };
    req.onerror = () => rej(req.error);
  });
}

describe("V2's log survives an origin that already ran V1", () => {
  it("opens clean under its own name, ignoring V1's database entirely", async () => {
    await seedV1();
    cleanup.push("table-companion-v2");

    const store = await openLog(); // default name — this is the regression this test guards
    expect(await store.all()).toEqual([]);
    store.close();

    // V1's database is untouched: same marker, no upgrade forced on it.
    expect(await readV1Marker()).toBe("a-v1-marker");
  });

  it("does not collide even when V2's log is opened before V1 exists", async () => {
    cleanup.push("table-companion-v2");
    const store = await openLog();
    await store.append([{ id: "e1", kind: "tick", data: {}, by: asDevice("d1"), at: 1, seq: 1 }]);
    store.close();

    await seedV1();

    const reopened = await openLog();
    expect((await reopened.all()).map((e) => e.id)).toEqual(["e1"]);
    reopened.close();
  });
});
