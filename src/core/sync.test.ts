import { describe, it, expect, vi } from "vitest";
import { connect, roomCode, isRoomCode, type Socket } from "./sync";
import { Clock } from "./log";
import { fold } from "./fold";
import { asDevice, type Event } from "./types";

/** A socket that records what was sent and lets a test drive the other end. */
function fakeSocket() {
  const sent: string[] = [];
  const s: Socket = {
    send: (d) => { sent.push(d); },
    close: () => { s.onclose?.(); },
    onopen: null, onclose: null, onerror: null, onmessage: null,
  };
  return {
    socket: s,
    sent,
    messages: () => sent.map((x) => JSON.parse(x) as { kind: string; events?: Event[] }),
    open: () => s.onopen?.(),
    drop: () => s.onclose?.(),
    deliver: (kind: string, events: readonly Event[]) => s.onmessage?.({ data: JSON.stringify({ kind, events }) }),
  };
}

const events = (device: string, n: number): Event[] => {
  const c = new Clock(asDevice(device));
  return Array.from({ length: n }, () => c.issue("tick"));
};

const count = (s: number, e: Event) => (e.kind === "tick" ? s + 1 : s);

describe("room codes", () => {
  it("are six characters a person can read out loud", () => {
    const code = roomCode();
    expect(code).toHaveLength(6);
    expect(isRoomCode(code)).toBe(true);
  });

  it("contain nothing that can be misheard or mistyped", () => {
    // No vowels — so no code spells anything — and no O/0 or I/1.
    for (let i = 0; i < 200; i++) expect(roomCode()).not.toMatch(/[AEIOU01]/);
  });

  it("refuse anything else", () => {
    expect(isRoomCode("ABCDEF")).toBe(false); // vowels
    expect(isRoomCode("BCDFG")).toBe(false); // too short
  });
});

describe("joining a room", () => {
  const start = (local: Event[] = []) => {
    const f = fakeSocket();
    const seen: Event[] = [];
    const states: string[] = [];
    const sync = connect("BCDFGH", {
      open: () => f.socket,
      local: () => local,
      onEvents: (e) => seen.push(...e),
      onState: (s) => states.push(s),
      schedule: () => {},
    });
    return { f, seen, states, sync };
  };

  it("asks for everything and offers everything on connection", () => {
    const mine = events("a", 3);
    const { f } = start(mine);
    f.open();
    const kinds = f.messages().map((m) => m.kind);
    expect(kinds).toEqual(["hello", "append"]);
    expect(f.messages()[1]!.events).toHaveLength(3);
  });

  it("says nothing extra when it has nothing to offer", () => {
    const { f } = start([]);
    f.open();
    expect(f.messages().map((m) => m.kind)).toEqual(["hello"]);
  });

  it("hands over what the room sends back", () => {
    const { f, seen } = start();
    f.open();
    f.deliver("catchup", events("b", 4));
    expect(seen).toHaveLength(4);
    f.deliver("events", events("c", 1));
    expect(seen).toHaveLength(5);
  });

  it("ignores a message it cannot read rather than dying", () => {
    const { f, seen } = start();
    f.open();
    f.socket.onmessage?.({ data: "not json" });
    f.socket.onmessage?.({ data: JSON.stringify({ kind: "nonsense" }) });
    expect(seen).toEqual([]);
  });
});

describe("a phone in a cellar is offline, not broken", () => {
  it("holds what it wrote and sends it when the room comes back", () => {
    const f1 = fakeSocket();
    const f2 = fakeSocket();
    let nth = 0;
    const sockets = [f1, f2];
    const sync = connect("BCDFGH", {
      open: () => sockets[nth++]!.socket,
      local: () => [],
      onEvents: () => {},
      schedule: (fn) => { fn(); },
      retry: 0,
    });

    f1.open();
    expect(sync.state()).toBe("live");
    f1.drop();
    // A new socket exists but has not opened yet: connecting, not live.
    expect(sync.state()).toBe("connecting");

    // Written while the connection was down.
    const offline = events("a", 2);
    sync.push(offline);
    f2.open();

    const appended = f2.messages().filter((m) => m.kind === "append");
    expect(appended.at(-1)!.events).toHaveLength(2);
  });

  it("never loses an event by being pushed twice", () => {
    const { f, sync } = (() => {
      const fk = fakeSocket();
      const s = connect("BCDFGH", {
        open: () => fk.socket, local: () => [], onEvents: () => {}, schedule: () => {},
      });
      return { f: fk, sync: s };
    })();
    f.open();
    const mine = events("a", 2);
    sync.push(mine);
    sync.push(mine);
    // The wire carries it twice; the room keys by id, so the room holds two.
    const all = f.messages().filter((m) => m.kind === "append").flatMap((m) => m.events ?? []);
    expect(new Set(all.map((e) => e.id)).size).toBe(2);
  });

  it("stops trying once it is closed", () => {
    const f = fakeSocket();
    const schedule = vi.fn();
    const sync = connect("BCDFGH", {
      open: () => f.socket, local: () => [], onEvents: () => {}, schedule,
    });
    f.open();
    sync.close();
    f.drop();
    expect(schedule).not.toHaveBeenCalled();
    expect(sync.state()).toBe("offline");
  });
});

describe("two devices reach the same state", () => {
  it("folds identically however the halves arrive", () => {
    // The property the whole room rests on: the log is a set, ordered by a
    // counter, so who heard what first cannot change the answer.
    const mine = events("a", 4);
    const theirs = events("b", 3);
    const oneWay = fold([...mine, ...theirs], count, 0);
    const other = fold([...theirs, ...mine], count, 0);
    expect(oneWay).toBe(other);
    expect(oneWay).toBe(7);
  });
});
