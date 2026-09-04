import { DmShell } from "../dm/DmShell";
import { Shell } from "../../ui/Shell";
import { Bestiary } from "../dm/Bestiary";
import { SpellLookup } from "./SpellLookup";
import type { Fetcher } from "../../content/load";
import type { ReactNode } from "react";
import s from "./BookScreen.module.css";

/**
 * The Book: reachable by both seats, only half of it by one of them.
 *
 * Task 47 put the bestiary behind the DM's seat for a reason `tabs.ts` still
 * quotes: *"a player who can look up the statblock knows the armour class and
 * the hit points, which is exactly what the disclosure ladder exists to
 * withhold."* Task 48 does not undo that — it adds spells, and spells do not
 * carry the same secret. A player who can look up Hold Person's saving throw
 * knows exactly what the DM knows, because that is the whole of V1's
 * complaint: *"the person who has to RULE on a spell had less access to it
 * than the person casting it."*
 *
 * So one screen has to tell two different truths, and the seam is a plain
 * `if` rather than a second internal tab: a tab a player can see sitting
 * there — disabled, or worse, tappable — is the seat check moved from
 * `tabs.ts` into a worse place to put it. Spells render for whoever reaches
 * this screen; the bestiary section renders only when `dm` is true. Nothing
 * about `tabs.ts`'s own gate changes — it still decides whether the Book TAB
 * exists at all for a seat — this is the gate one level in, for the one
 * section that still needs it.
 *
 * The shell also splits, and for a reason that predates this task:
 * `Bestiary.tsx` already committed to `DmShell`, tablet-first, because
 * DESIGN.md's DM side "starts at tablet and desktop and collapses to a
 * phone." A player reaches this screen from their own phone mid-turn — the
 * exact case `ui/Shell.tsx` is built for — so the two seats do not merely see
 * different SECTIONS, they see different SHELLS, same as everywhere else a
 * player's and a DM's surface diverge.
 */
export function BookScreen({ dm, nav, fetcher }: { dm: boolean; nav?: ReactNode; fetcher?: Fetcher }) {
  const lookup = <SpellLookup {...(fetcher === undefined ? {} : { fetcher })} />;

  if (!dm) {
    return <Shell title="Spells" below={nav}>{lookup}</Shell>;
  }

  return (
    <DmShell title="The book" below={nav}>
      <section className={s.section} aria-label="Spells">
        <h2 className={s.title}>Spells</h2>
        {lookup}
      </section>
      <Bestiary {...(fetcher === undefined ? {} : { fetcher })} />
    </DmShell>
  );
}
