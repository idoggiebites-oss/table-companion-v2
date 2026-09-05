import { Sheet } from "./Sheet";
import { homebrewFrom, HOMEBREW } from "./homebrew";
import { vitalsFrom, VITAL, type Vital } from "./model";
import { progressFrom, levelsOwed } from "../dm/xp";
import { holdingsFrom, purseOf, heldBy, HOLD } from "../room/holdings";
import { membersIn } from "../dm/members";
import { CHOICE } from "../creation/model";
import type { Build } from "../creation/model";
import type { Choice } from "../creation/choices";
import type { Item } from "../../rules/5e/items";
import type { Event } from "../../core/types";
import type { ReactNode } from "react";

/**
 * A character's own sheet, assembled.
 *
 * Split out of `App.tsx` at its budget, the seam `HubScreen`, `PrepScreen` and
 * `LogScreen` were split along: App routes, and folding a build, its vitals,
 * its homebrew and what the DM owes it is not routing.
 */
export function SheetScreen({
  events, character, build, features, catalogue, catalogueLoading, nav, record, onBack, onLevelUp,
}: {
  events: readonly Event[];
  character: string;
  build: Build;
  features: readonly { readonly level: number; readonly names: readonly string[] }[];
  /** The compendium's items, before this character's own are folded in. */
  catalogue: readonly Item[];
  catalogueLoading: boolean;
  nav?: ReactNode;
  record: (kind: string, data: Record<string, unknown>) => void;
  onBack: () => void;
  onLevelUp: () => void;
}) {
  /* The whole homebrew integration, and one line is the point — see
     `features/sheet/homebrew.ts`. The compendium comes FIRST so an exact
     catalogue name wins a tie. */
  const made = homebrewFrom(events);
  const held = holdingsFrom(events);
  return (
    <Sheet
      build={build}
      features={features}
      catalogue={[...catalogue, ...made]}
      made={made}
      onMake={(i) => record(HOMEBREW, { act: "save", item: i } as unknown as Record<string, unknown>)}
      onForgetMade={(id) => record(HOMEBREW, { act: "forget", id })}
      catalogueLoading={catalogueLoading}
      onChoose={(c: Choice) => record(CHOICE, { ...(c as unknown as Record<string, unknown>), character })}
      vitals={vitalsFrom(events, character, build)}
      name={build.identity["name"] ?? "Unnamed"}
      onAct={(v: Vital) => record(VITAL, { ...(v as unknown as Record<string, unknown>), character })}
      onBack={onBack}
      nav={nav}
      /* A level is the DM's to hand over and the player's to take. */
      owed={levelsOwed(progressFrom(events), character, build.level)}
      onLevelUp={onLevelUp}
      purse={purseOf(held, character)}
      held={(base) => heldBy(held, character, base)}
      /* Never themselves: handing something to yourself is not a thing. */
      party={membersIn(events).filter((m) => m.id !== character).map((m) => ({ id: m.id, name: m.name }))}
      onGive={(to, stack, qty) => record(HOLD, {
        act: "move", from: character, to, itemId: stack.itemId, name: stack.name, qty,
      })}
    />
  );
}
