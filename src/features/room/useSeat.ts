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

export function useSeat(exists: readonly string[]): {
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

  /* A seat pointing at a character who is gone — undone, or on a device that
     cleared its log — is a device with no sheet and no way back. */
  const held = seatIn(seat, exists);
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
