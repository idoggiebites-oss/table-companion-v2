import type { Event } from "../../core/types";
import type { Clock } from "../../core/log";
import { CHOICE } from "./model";
import type { CharacterId } from "./choices";
import { TAKE } from "../progression/model";

/**
 * Export is the events, not the state.
 *
 * A character IS its log, so writing the state out would be writing down a
 * conclusion and losing the reasons. Re-importing replays it, which is why the
 * round trip is exact rather than approximately right.
 */
export type Sheet = { readonly format: "table-companion/character"; readonly version: 1; readonly events: readonly Event[] };

export const toSheet = (events: readonly Event[]): Sheet => ({
  format: "table-companion/character", version: 1,
  events: events.filter((e) => e.kind === CHOICE || e.kind === TAKE || e.kind === "skip"),
});

/**
 * Take an imported log in as this device's own events, under a new character.
 *
 * Ids are reissued rather than reused: importing the same file twice must make
 * two characters, not merge one into itself. Undo markers are remapped along
 * with their targets, so an imported character stays exactly as undone as it
 * was exported.
 */
export function adopt(events: readonly Event[], clock: Clock, character: CharacterId): Event[] {
  const remap = new Map<string, string>();
  const out: Event[] = [];
  for (const e of events) {
    const data = e.kind === "skip" ? { ...e.data } : { ...e.data, character };
    const issued = clock.issue(e.kind, data, e.at);
    remap.set(e.id, issued.id);
    out.push(issued);
  }
  return out.map((e) => {
    if (e.kind !== "skip") return e;
    const target = e.data["target"];
    if (typeof target !== "string") return e;
    return { ...e, data: { ...e.data, target: remap.get(target) ?? target } };
  });
}

export function fromSheet(json: unknown): Event[] {
  if (typeof json !== "object" || json === null) throw new Error("Not a character file.");
  const s = json as Partial<Sheet>;
  if (s.format !== "table-companion/character") {
    throw new Error("That is not a character file. A compendium goes to Import Content.");
  }
  if (s.version !== 1) throw new Error(`Character files of version ${String(s.version)} are not readable here.`);
  if (!Array.isArray(s.events)) throw new Error("The file carries no events.");
  return [...s.events];
}
