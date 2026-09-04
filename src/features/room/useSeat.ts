import { useCallback, useEffect, useState } from "react";
import { DM, seatIn, type Seat } from "./seat";

/**
 * The seat this device holds, remembered across reloads.
 *
 * `localStorage`, not the log — the same reason the theme lives there, and the
 * reason ARCHITECTURE.md states outright: device-local state never becomes an
 * Event. Wrapped in try/catch because private mode throws, and a seat is not
 * worth failing to render over.
 *
 * A fresh device defaults to the DM. That is right when it is the only device
 * in the house and wrong the instant it joins somebody else's room, which is
 * what `claim` is for.
 */
const SEAT = "seat";
const MINE = "myCharacters";
/** Per room, because a device can be the DM of one table and a player at another. */
const DM_KEY = (room: string) => `dmKey:${room}`;

const read = <T,>(key: string, fallback: T): T => {
  try {
    const raw = localStorage.getItem(key);
    return raw === null ? fallback : (JSON.parse(raw) as T);
  } catch {
    return fallback;
  }
};

const write = (key: string, value: unknown): void => {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* see `read` */ }
};

/**
 * Whether this device may take the DM's seat in this room.
 *
 * Not in a room at all — solo, or before joining — and it may: a device on its
 * own kitchen table is its own DM, which is what `useSeat` has always
 * defaulted to. In a room, it may only if it holds that room's key, which it
 * gets by opening the room or by being told the key by a person.
 *
 * `localStorage`, wrapped, like every other device-local fact here.
 */
export const mayBeDm = (room: string | null): boolean =>
  room === null || read<string | null>(DM_KEY(room), null) !== null;

export const rememberDmKey = (room: string, key: string): void => {
  write(DM_KEY(room), key);
};

export const dmKeyFor = (room: string): string | null =>
  read<string | null>(DM_KEY(room), null);

export function useSeat(exists: readonly string[], mayBeDm = true): {
  readonly seat: Seat;
  /** The characters this device says are its own. */
  readonly mine: readonly string[];
  readonly sit: (seat: Seat) => void;
  /** Remember a character as this device's, and sit in it. */
  readonly claim: (character: string) => void;
  /** Hold it without sitting: loading two characters claims both, sits in one. */
  readonly hold: (character: string) => void;
  readonly release: (character: string) => void;
} {
  const [seat, setSeat] = useState<Seat>(() => read<Seat>(SEAT, DM));
  const [mine, setMine] = useState<readonly string[]>(() => read<string[]>(MINE, []));

  /*
   * A seat pointing at a character who is gone — undone, or on a device that
   * cleared its log — is a device with no sheet and no way back.
   *
   * And a DM seat this device may not hold. Hiding "The DM" from the picker is
   * not enough on its own: this hook defaults every fresh device to the DM, so
   * a phone that has never been in a room arrives in somebody else's already
   * sitting there. Without this the option disappears and the device keeps the
   * seat, which is the same accident with an extra step. It falls back to a
   * character of its own if it has one, and otherwise to nobody — which
   * `SeatControl` draws as "Watching".
   */
  /*
   * `seatIn` FIRST, then the eviction — the order is the whole of it. `seatIn`
   * falls back to the DM for a player seat pointing at nobody, so evicting
   * first and correcting second put a keyless device straight back in the seat
   * it had just been moved out of.
   */
  const corrected = seatIn(seat, exists);
  const held: Seat = corrected.kind === "dm" && !mayBeDm
    ? { kind: "player", character: exists[0] ?? "" }
    : corrected;
  useEffect(() => {
    if (held !== seat) { setSeat(held); write(SEAT, held); }
  }, [held, seat]);

  const sit = useCallback((next: Seat) => { setSeat(next); write(SEAT, next); }, []);

  const hold = useCallback((character: string) => {
    setMine((was) => {
      if (was.includes(character)) return was;
      const next = [...was, character];
      write(MINE, next);
      return next;
    });
  }, []);

  const claim = useCallback((character: string) => {
    hold(character);
    sit({ kind: "player", character });
  }, [hold, sit]);

  const release = useCallback((character: string) => {
    setMine((was) => {
      const next = was.filter((x) => x !== character);
      write(MINE, next);
      return next;
    });
  }, []);

  return { seat: held, mine, sit, claim, hold, release };
}
