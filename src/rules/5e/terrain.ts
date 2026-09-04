/**
 * What the room is like.
 *
 * The app computes a great deal about a roll — conditions on both sides, who
 * is prone, who cannot see — and nothing at all about WHERE the fight is
 * happening. That is not a gap; it is the line this app draws on purpose:
 * positions live on the table, so it never guesses at reach, cover or line of
 * sight.
 *
 * But a room has facts that are not positional. It is dark. The floor is
 * rubble. There is a gale. Those apply to everyone at once, the DM knows them
 * the moment the scene opens, and every one of them changes what somebody is
 * told to roll. Left unmodelled they get remembered by one person and applied
 * to whoever they happen to think of.
 *
 * So the DM says what the room is like, once, and every turn after that says
 * what it means for the person taking it.
 *
 * Ported from V1's `domain/terrain.ts`. Two of its functions did NOT come:
 * `checkEffects`, because V2 has no screen where a skill check is rolled, and
 * `movementCost`, because a V2 combatant has no speed to halve. Both are
 * small and both are wanted the day their screen exists; neither is written
 * here in advance of one.
 */

/** How much light there is. Deliberately three words, not a number. */
export type Light = "bright" | "dim" | "dark";

/**
 * A fact about the room, not about anybody in it.
 *
 * Kept to what a table actually says out loud and what the rules actually
 * change. Cover is deliberately absent: it is positional, and the DM calls it
 * per attack.
 */
export type TerrainTag =
  | "difficult"
  | "obscured"
  | "wind"
  | "underwater"
  | "unstable"
  | "silence";

export type Room = {
  readonly light: Light;
  readonly terrain: readonly TerrainTag[];
};

export const OPEN_GROUND: Room = { light: "bright", terrain: [] };

export const TERRAIN: readonly {
  readonly id: TerrainTag;
  readonly name: string;
  /** What the DM is choosing, in the words they would use. */
  readonly what: string;
}[] = [
  { id: "difficult", name: "Difficult ground", what: "Rubble, mud, undergrowth. Every foot costs two." },
  { id: "obscured", name: "Fog or smoke", what: "Heavily obscured. Sight is no help to anyone in it." },
  { id: "wind", name: "Strong wind", what: "Ranged attacks and listening both suffer." },
  { id: "underwater", name: "Underwater", what: "Melee is a slog unless the weapon is made for it." },
  { id: "unstable", name: "Unstable footing", what: "Ice, a rolling deck, a rope bridge." },
  { id: "silence", name: "Silence", what: "Magical. Nothing here can be heard, or cast aloud." },
];

export const LIGHTS: readonly { readonly id: Light; readonly name: string }[] = [
  { id: "bright", name: "Bright" },
  { id: "dim", name: "Dim" },
  { id: "dark", name: "Dark" },
];

/** Whether anything has been said about this room at all. */
export const isOpenGround = (r: Room): boolean =>
  r.light === "bright" && r.terrain.length === 0;

/**
 * What the room does to a roll, in the words the turn will print.
 *
 * The same shape as a `StanceReason`, and structurally so rather than by
 * import: the rule about advantage belongs to `stance.ts` and the rule about
 * rubble belongs here, and neither should have to load the other to be read.
 */
export type RoomEffect = {
  readonly effect: "advantage" | "disadvantage";
  readonly because: string;
};

/**
 * The room's contribution to an attack.
 *
 * Deliberately narrow. Being underwater does not make every attack worse — it
 * makes MELEE worse, and ranged attacks beyond a short distance simply miss,
 * which is a call the DM makes rather than a modifier. Wind troubles arrows
 * and not swords. An app that shrugged and applied disadvantage to everything
 * would be easier to write and wrong often enough to distrust.
 *
 * **Light is carried and not consulted.** Fighting in the dark plainly matters,
 * and saying so correctly needs darkvision, which needs senses on a combatant,
 * which V2 does not have — `stance.ts` lists that same gap. A guess here would
 * hand disadvantage to the dwarf who can see perfectly well, so the room says
 * "dark" to the table and the table rules on it.
 */
export function roomEffects(
  room: Room,
  { range }: { range: "Melee" | "Ranged" },
): readonly RoomEffect[] {
  const out: RoomEffect[] = [];
  const dis = (because: string) => out.push({ effect: "disadvantage", because });

  if (room.terrain.includes("obscured")) dis("you cannot see through it");
  if (room.terrain.includes("wind") && range === "Ranged") dis("the wind is against you");
  if (room.terrain.includes("underwater") && range === "Melee") dis("swinging underwater");
  if (room.terrain.includes("unstable")) dis("you cannot plant your feet");
  return out;
}

/** One line for the track, so the table can see what the room is. */
export function describeRoom(room: Room): string {
  const parts: string[] = [];
  if (room.light !== "bright") parts.push(room.light);
  for (const t of room.terrain) {
    parts.push(TERRAIN.find((x) => x.id === t)?.name.toLowerCase() ?? t);
  }
  return parts.join(" · ");
}
