import { fold } from "../../core/fold";
import type { Event } from "../../core/types";
import { isOpenGround, OPEN_GROUND, type Room } from "../../rules/5e/terrain";
import { staging, type Encounter } from "./encounter";
import type { Act } from "./fight";

export const SCENE = "scene.act";

/**
 * A place, prepared before anybody sits down.
 *
 * V2 could keep encounters, and after Task 20 it will keep NPCs — separate
 * kinds of thing that nothing joins up, which is a bestiary rather than a
 * plan. What a DM actually prepares is a PLACE: the cellar, with its dark and
 * its rubble, the thing waiting in it, and the line they mean to read out when
 * the door opens.
 *
 * A scene is the join: a room, an encounter, and a note, under a name, ready
 * to be put live in one press.
 *
 * **Deliberately not a map and not a sequence.** Scenes are a drawer you reach
 * into, not a track a session runs along — a table goes where it goes, and a
 * tool that assumed an order would be wrong every session and smug about it.
 * The prep mockup numbers them 1-5 with drag handles; this is the one place
 * the build departs from it, and it departs on V1's reasoning rather than by
 * omission. Reversible the day a real session says otherwise.
 *
 * Ported from V1's `domain/scenes.ts`.
 */
export type Scene = {
  readonly id: string;
  readonly name: string;
  /** What the room is like when this scene opens. */
  readonly room: Room;
  /** An encounter to stage, by id. Absent means nothing is waiting. */
  readonly encounter?: string;
  /** What the DM means to say, or remember. Never reaches a player. */
  readonly note?: string;
};

export const blankScene = (id: string): Scene => ({ id, name: "", room: OPEN_GROUND });

/** Ready enough to keep: a name is the only thing a scene truly needs. */
export const isNamed = (scene: Scene): boolean => scene.name.trim().length > 0;

/**
 * One line, for the drawer. Says what is IN it rather than restating the name
 * — a list where every row repeats its own title tells you nothing.
 */
export function describeScene(scene: Scene, encounterName?: string): string {
  const parts: string[] = [];
  if (scene.room.light !== "bright") parts.push(scene.room.light);
  if (scene.room.terrain.length > 0) {
    const n = scene.room.terrain.length;
    parts.push(`${String(n)} thing${n === 1 ? "" : "s"} about the ground`);
  }
  if (encounterName !== undefined && encounterName !== "") parts.push(encounterName);
  if ((scene.note ?? "").trim() !== "") parts.push("a note");
  return parts.join(" · ") || "open ground, nothing waiting";
}

/** Newest first, because the one you just wrote is the one you want. */
export const sortScenes = (scenes: readonly Scene[]): readonly Scene[] =>
  [...scenes].sort((a, b) => b.id.localeCompare(a.id));

export type Prepared = { readonly scenes: readonly Scene[] };
export const NOTHING_PREPARED: Prepared = { scenes: [] };

export type SceneAct =
  | { readonly act: "prepare"; readonly scene: Scene }
  | { readonly act: "forget"; readonly id: string };

const asAct = (e: Event): SceneAct | null =>
  e.kind === SCENE ? (e.data as unknown as SceneAct) : null;

function reduce(p: Prepared, e: Event): Prepared {
  const a = asAct(e);
  if (a === null) return p;
  switch (a.act) {
    case "prepare":
      /* Same id replaces, exactly as a kept encounter does: editing a place is
         not acquiring a second one. */
      return { scenes: [...p.scenes.filter((x) => x.id !== a.scene.id), a.scene] };
    case "forget":
      return { scenes: p.scenes.filter((x) => x.id !== a.id) };
  }
}

export const scenesFrom = (events: readonly Event[]): Prepared =>
  fold(events, reduce, NOTHING_PREPARED);

/**
 * Opening a place, as the acts it takes.
 *
 * Three things at once, which is the whole point: the room live for everybody,
 * the encounter staged, and — back on the screen — the note in front of the
 * DM. Doing them separately is what a DM does today, and forgetting the second
 * is why a fight starts in daylight that was supposed to be pitch dark.
 *
 * **Clear first, room last.** V1 met this from the other direction: staging a
 * combat built a fresh one on open ground, so setting the room before staging
 * silently wiped it. Here the eraser is `clear`, which returns `NO_FIGHT` and
 * with it `OPEN_GROUND` — so ordering these wrong reproduces the exact failure
 * that places exist to prevent. It is a list rather than a sequence of calls
 * so that the ordering is a thing a test can hold.
 */
export function openActs(
  scene: Scene,
  encounter: Encounter | undefined,
  id: (n: number) => string,
): readonly Act[] {
  const out: Act[] = [{ act: "clear" }];
  if (encounter !== undefined) {
    for (const row of staging(encounter, id)) {
      out.push({
        act: "stage", id: row.id, name: row.name, disclosure: row.disclosure,
        source: { kind: "creature", statblock: row.statblock, max: row.max, ac: row.ac },
      });
    }
  }
  /*
   * The encounter's own environment wins, when it has one.
   *
   * Both can carry a room and they mean different things: a place's is what
   * that room is like to walk into, and an encounter's is what it is like when
   * THIS fight starts — the same cellar with the lanterns knocked out. So the
   * more specific one wins, and "has one" means it is not open ground, because
   * open ground is the default rather than a choice anybody made.
   *
   * Stated here rather than left to whichever push happens to be last, because
   * a precedence rule nobody wrote down is a precedence rule that gets swapped
   * by an unrelated edit.
   */
  const room = encounter?.room !== undefined && !isOpenGround(encounter.room)
    ? encounter.room
    : scene.room;
  out.push({ act: "room", room });
  return out;
}
