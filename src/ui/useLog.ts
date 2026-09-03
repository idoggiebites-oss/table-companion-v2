import { useCallback, useEffect, useRef, useState } from "react";
import { Clock, order } from "../core/log";
import { connect, type Sync, type SyncState } from "../core/sync";
import { openLog, type Store } from "../core/persist";
import { asDevice, type Event, type EventId } from "../core/types";

/** One device id per browser profile. Device-local: it never enters the log. */
function thisDevice(): string {
  const key = "device";
  let id = localStorage.getItem(key);
  if (id === null) {
    id = Math.random().toString(36).slice(2, 8);
    localStorage.setItem(key, id);
  }
  return id;
}

export function useLog(dbName?: string, room?: string) {
  const [events, setEvents] = useState<readonly Event[]>([]);
  const [clock] = useState(() => new Clock(asDevice(thisDevice())));
  const [store, setStore] = useState<Store | null>(null);
  const [link, setLink] = useState<SyncState>("offline");
  const sync = useRef<Sync | null>(null);
  const held = useRef<readonly Event[]>([]);
  held.current = events;

  useEffect(() => {
    let live = true;
    void openLog(dbName).then(async (s) => {
      const existing = await s.all();
      if (!live) return s.close();
      clock.witness(existing);
      setStore(s);
      setEvents(existing);
    });
    return () => { live = false; };
  }, [clock, dbName]);

  /** Merge by id: the same event arriving twice is the same event. */
  const absorb = useCallback(
    (incoming: readonly Event[]) => {
      setEvents((prev) => {
        const have = new Set(prev.map((e) => e.id));
        const fresh = incoming.filter((e) => !have.has(e.id));
        if (fresh.length === 0) return prev;
        void store?.append(fresh);
        return order([...prev, ...fresh]);
      });
    },
    [store],
  );

  useEffect(() => {
    if (room === undefined || store === null) return;
    const s = connect(room, {
      open: (path) => new WebSocket(new URL(path, location.href).href.replace(/^http/, "ws")) as never,
      local: () => held.current,
      onEvents: absorb,
      onState: setLink,
    });
    sync.current = s;
    return () => { s.close(); sync.current = null; };
  }, [room, store, absorb]);

  const push = useCallback(
    (e: Event) => {
      setEvents((prev) => [...prev, e]);
      void store?.append([e]);
      sync.current?.push([e]);
    },
    [store],
  );

  const add = useCallback((kind: string) => push(clock.issue(kind)), [clock, push]);
  /** Append an event carrying data. Every choice a screen makes comes through here. */
  const record = useCallback(
    (kind: string, data: Readonly<Record<string, unknown>>) => push(clock.issue(kind, data)),
    [clock, push],
  );
  const undo = useCallback((id: EventId) => push(clock.undo(id)), [clock, push]);

  /** Several events at once — an imported character arrives as a whole log. */
  const pushMany = useCallback(
    (batch: readonly Event[]) => {
      if (batch.length === 0) return;
      setEvents((prev) => [...prev, ...batch]);
      void store?.append(batch);
      sync.current?.push(batch);
    },
    [store],
  );

  /**
   * Empty the log.
   *
   * The screen empties first and the store follows. Clearing the store and
   * *then* emptying the screen loses anything appended in between: a click on
   * Clear followed straight away by a click on Append left one event on screen
   * and none in the database.
   */
  const reset = useCallback(async () => {
    setEvents([]);
    await store?.clear();
  }, [store]);

  /** Non-event traffic to the room: subscriptions and nudges. See `Sync.say`. */
  const say = useCallback((message: Readonly<Record<string, unknown>>) => {
    sync.current?.say(message);
  }, []);

  return { events, add, record, pushMany, undo, reset, say, clock, link, ready: store !== null };
}
