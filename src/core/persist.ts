import type { Event } from "./types";

/**
 * The log on this device. IndexedDB rather than localStorage: the log grows
 * for a whole campaign, and a quota error must not be the first thing a table
 * learns about it.
 */
export type Store = {
  all(): Promise<Event[]>;
  append(events: readonly Event[]): Promise<void>;
  clear(): Promise<void>;
  close(): void;
};

const STORE = "events";

const promise = <T,>(req: IDBRequest<T>): Promise<T> =>
  new Promise((res, rej) => {
    req.onsuccess = () => res(req.result);
    req.onerror = () => rej(req.error ?? new Error("indexeddb request failed"));
  });

/**
 * Named distinctly from V1's `table-companion` database (version 2, stores
 * `log` + `meta`). V2 opens at version 1 — a lower version than an existing
 * database raises `IDBOpenDBRequest.onerror` with `VersionError`, so sharing
 * the name would break V2 on every device that ever ran V1. No data migrates
 * between the two; this is a distinct name, not a rename in place.
 */
export async function openLog(name = "table-companion-v2"): Promise<Store> {
  const db = await new Promise<IDBDatabase>((res, rej) => {
    const req = indexedDB.open(name, 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) {
        // Keyed by event id, so writing the same event twice is a no-op.
        // Sync will do exactly that, repeatedly.
        req.result.createObjectStore(STORE, { keyPath: "id" });
      }
    };
    req.onsuccess = () => res(req.result);
    req.onerror = () => rej(req.error ?? new Error("indexeddb open failed"));
  });

  const tx = (mode: IDBTransactionMode) => db.transaction(STORE, mode).objectStore(STORE);

  /**
   * One operation at a time, in the order they were asked for.
   *
   * IndexedDB transactions overlap happily, so a `clear` still in flight will
   * delete a write that was issued after it. Clearing the log and immediately
   * appending two events left one of them in the database and neither the
   * screen nor the code any the wiser.
   */
  let queue: Promise<unknown> = Promise.resolve();
  const inOrder = <T,>(work: () => Promise<T>): Promise<T> => {
    const next = queue.then(work, work);
    queue = next.catch(() => undefined);
    return next;
  };

  return {
    all: () => inOrder(() => promise(tx("readonly").getAll() as IDBRequest<Event[]>)),
    append: (events) =>
      inOrder(async () => {
        if (events.length === 0) return;
        const t = db.transaction(STORE, "readwrite");
        const store = t.objectStore(STORE);
        for (const e of events) store.put(e);
        await new Promise<void>((res, rej) => {
          t.oncomplete = () => res();
          t.onerror = () => rej(t.error ?? new Error("indexeddb write failed"));
        });
      }),
    clear: () => inOrder(async () => { await promise(tx("readwrite").clear()); }),
    close: () => db.close(),
  };
}
