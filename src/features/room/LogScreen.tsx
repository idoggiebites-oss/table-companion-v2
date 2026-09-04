import { LastTime } from "./LastTime";
import { WhatNow } from "./WhatNow";
import { promptsFor } from "./prompts";
import { logFor, mayRevert } from "./visibility";
import { LogView } from "../../ui/LogView";
import { membersIn } from "../dm/members";
import { scenesFrom } from "../dm/scene";
import { prepFrom } from "../dm/encounter";
import type { Fight } from "../dm/fight";
import type { Vitals } from "../sheet/model";
import type { DeviceId, Event, EventId } from "../../core/types";

/**
 * The log tab, in three bands: the night, what to do about it, the rows.
 *
 * Split out of `App.tsx` at the component budget, and the seam was the same
 * one `PrepScreen.tsx` found: App is a router, and how a night is read back is
 * not a router's business. Three components and a prompt derivation lived
 * there only because that is where they were first wired.
 *
 * Everything here reads `logFor(events, dm)` rather than the raw log — the
 * filtering happens once, above the screens, so none of them can accidentally
 * render an event it should never have been handed.
 */
export function LogScreen({
  events, dm, device, fight, vitals, tabs, nameOf, onGo, onUndo,
}: {
  events: readonly Event[];
  dm: boolean;
  device: DeviceId;
  fight: Fight;
  vitals: Vitals | null;
  /** Tab ids that exist for this seat — the filter on what a prompt may offer. */
  tabs: readonly string[];
  nameOf: (id: string) => string;
  onGo: (tab: string) => void;
  onUndo: (id: EventId) => void;
}) {
  const mine = logFor(events, dm);
  return (
    <>
      {/* The same events, read forwards. Above the rows because that is what
          it IS — a person who wants the transactions scrolls past. */}
      <LastTime events={mine} nameOf={nameOf} />
      {/* And what it changed. Each one goes somewhere; none goes on its own. */}
      <WhatNow
        onGo={onGo}
        prompts={promptsFor({
          dm, tabs, fight,
          party: membersIn(events),
          vitals,
          scenes: scenesFrom(events).scenes.length,
          encounters: prepFrom(events).encounters.length,
        })}
      />
      {/* One lookup for both: a character by id, and a creature by its
          combatant id — so a fight row can say "Goblin 2 took 5" rather than
          "a creature took 5" wherever the fight still holds the name. */}
      <LogView
        events={mine}
        nameOf={(id) => fight.combatants.find((c) => c.id === id)?.name ?? nameOf(id)}
        onUndo={onUndo}
        mayUndo={(e) => mayRevert(e, dm, device)}
      />
    </>
  );
}
