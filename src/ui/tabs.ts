import type { IconName } from "./Icon";

/**
 * One bar, and its contents are computed — V1's model, minus the seat.
 *
 * It was drawn with five fixed entries — Home, Characters, Companion, Library,
 * More — and none of them went anywhere: `onGo` existed and nothing passed
 * one. Meanwhile the hub carried a SECOND navigation whose Combat and Equip
 * belonged to a character the hub had not opened yet.
 *
 * Three of V1's rules apply already:
 *
 *   - **A tab appears only when it has something on it.** V1 omits Spells for
 *     a character who casts nothing — "a fighter has nothing to put on it".
 *     Here it is Sheet, which needs a character to be a sheet OF.
 *   - **A tab can carry a dot.** The cost of tabs is that things go out of
 *     sight, and one of the things that can go out of sight is a save owed
 *     right now. A dot marks it; nothing here moves you on its own.
 *   - **What is not built is not drawn.** Library the day there is a
 *     compendium screen, and the rest when they mean anything.
 *
 * And the fourth is here now: **contents by seat**. V1 keeps one bar whose
 * entries depend on who you are — a DM's Party against a player's Sheet — and
 * it is one navigation, not two. A DM has no Sheet tab because a DM has no
 * character; a player has no Party because looking after the table is not
 * their job. Prep, Book and Gear join as the screens behind them are built.
 */
export type Tab = { readonly id: string; readonly label: string; readonly icon: IconName; readonly dot?: boolean };

export function tabsFor({ dm, waiting, owed, fighting }: {
  /**
   * Sitting as the DM rather than in a character.
   *
   * This is the whole of the has-content rule now. A player seat always has a
   * character — `seatIn` drops a seat whose character has gone — so "does a
   * Sheet tab have anything on it" and "is this device a player" are the same
   * question, and asking it twice was a parameter that could not be false.
   */
  dm?: boolean;
  /** Something is owed on this character's sheet right now. */
  waiting?: boolean;
  /** Somebody in the party owes something. */
  owed?: boolean;
  /** A fight is actually running. */
  fighting?: boolean;
}): readonly Tab[] {
  const rest: readonly Tab[] = [
    { id: "characters", label: "Characters", icon: "shield" },
    { id: "log", label: "Log", icon: "list" },
  ];
  return dm === true
    ? [
        { id: "party", label: "Party", icon: "person", dot: owed === true },
        /* Label only — the id stays "fight" because it is routing, wired into
           App, its tests and the journeys; renaming it would touch all three
           for no gain. "Combat" is what the DM's bar calls it now. */
        { id: "fight", label: "Combat", icon: "sword" },
        /* Prep is the DM's alone: staging a fight is not a player's job, which
           is the same line the Combat tab draws by seat. */
        { id: "prep", label: "Prep", icon: "book" },
        /* No Characters here: `Party.tsx`'s rows are already buttons wired to
           `onOpen`, and `App.tsx` (~line 288) wires that to
           `claim(id); setCharacter(id); setMode("sheet")`. The DM reaches any
           sheet by tapping the person on the Party screen, which is the
           better door anyway — one step instead of two, and it starts from
           the person rather than a bare list. No Notes tab either: the
           mockup draws one, but this file's own rule is that what is not
           built is not drawn, and there is no Notes screen yet. */
        { id: "log", label: "Log", icon: "list" },
      ]
    : [
        { id: "sheet", label: "Sheet", icon: "person", dot: waiting === true },
        /* V1's playerTabs carry Combat: a fight IS a player's business, even
           though staging it is not. The has-content rule decides when — a tab
           reading "no fight yet" is the dead screen V1 refuses to draw. */
        /* "Combat", the same word the DM's bar uses. One screen with two
           names depending on who is looking at it is a screen two people at
           the same table cannot talk about. */
        ...(fighting === true ? [{ id: "fight", label: "Combat", icon: "sword" as const }] : []),
        ...rest,
      ];
}

/**
 * The tab actually shown.
 *
 * V1: "a seat change can also leave you on a tab the other side does not
 * have." Here it is a character being undone while its sheet is open — the
 * Sheet tab goes, and a bar with nothing marked is a bar that has lost you.
 */
export const currentOf = (want: string, tabs: readonly Tab[]): string =>
  tabs.some((t) => t.id === want) ? want : "characters";
