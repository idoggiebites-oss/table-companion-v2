import { useEffect, useState } from "react";
import { statblock, type Statblock } from "./creatures";
import { StatblockView } from "./StatblockView";
import type { Option } from "../../content/legendary";
import s from "./CreatureBook.module.css";

/**
 * What this creature can do, on the screen the DM cannot leave.
 *
 * Closed by default and fetched on first open. One statblock is 1KB at the
 * median; all 6,633 are 2.3MB gzipped, which is why `creatures.ts` splits the
 * index from the detail and why staging three goblins must not pay for the
 * other six thousand.
 *
 * It is inside the DM's own row, so the disclosure ladder is untouched — a
 * player never renders `Staged`. That is the same argument the Book tab makes:
 * whoever can read the statblock knows the armour class, which is exactly what
 * the ladder exists to withhold.
 */
export function CreatureBook({ id, name, left, onTake }: {
  id: string; name: string;
  /** Legendary actions remaining this round, or nothing to say. */
  left?: number;
  onTake?: (option: Option) => void;
}) {
  const [open, setOpen] = useState(false);
  const [block, setBlock] = useState<Statblock | null>(null);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    if (!open || block !== null || missing) return;
    let live = true;
    void statblock(id).then((b) => {
      if (!live) return;
      if (b === null) setMissing(true); else setBlock(b);
    });
    return () => { live = false; };
  }, [open, id, block, missing]);

  return (
    <span className={s.book}>
      <button type="button" className={s.bookOpen} aria-expanded={open}
              data-testid="statblock-toggle"
              onClick={() => setOpen((o) => !o)}>
        {open ? "Hide statblock" : "Statblock"}
      </button>
      {/* Said on the row, not only inside the panel: a DM deciding whether to
          interrupt somebody's turn should not have to open anything to find
          out whether there is anything left to interrupt it with. */}
      {left !== undefined && (
        <span className={s.legLeft} data-testid="legendary-left">
          {left} legendary left
        </span>
      )}
      {open && block !== null && (
        <StatblockView block={block} {...(onTake === undefined ? {} : { onTake })} />
      )}
      {/* An SRD-only build ships no detail files at all, so this is a normal
          state rather than an error, and it says which of the two it is. */}
      {open && missing && (
        <p className={s.bookNone} data-testid="statblock-missing">
          No statblock for {name} in this build.
        </p>
      )}
    </span>
  );
}
