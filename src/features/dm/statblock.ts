/**
 * A statblock, read.
 *
 * V1 lifted this out of the monster reference because the fight needed the
 * same thing and was getting a thirtieth of it: staging a creature kept its
 * hit points, its armour class and the actions that deal damage, and dropped
 * everything else at the boundary — 17 of 57 entries across seven common
 * monsters. Nimble Escape, Regeneration, Legendary Resistance, Petrifying
 * Gaze and, on nearly every statblock in the game, Multiattack: gone.
 *
 * V2's defect was worse and quieter. The data is complete — `detail/creature`
 * carries every trait, every reaction, and the to-hit and damage already
 * parsed out of the prose (466 of 907 sampled actions have them) — and
 * `creatures.ts` has had a `statblock()` loader since the content layer was
 * written. **Nothing ever called it.** A staged creature showed a name, an AC
 * and a hit point total, and the other 6,633 statblocks' worth of text was
 * fetched by no screen in the app.
 *
 * So this module is the reading, not the parsing. Everything here turns
 * shipped fields into the line a DM says out loud.
 */

/** One entry: a trait, an action, a reaction. */
export type Entry = {
  readonly name: string;
  readonly desc?: string;
  /** Present when the prose said "+4 to hit". Parsed at build, not here. */
  readonly attackBonus?: number;
  readonly damage?: readonly { readonly dice: string; readonly type?: string }[];
};

const signed = (n: number) => (n < 0 ? `−${String(Math.abs(n))}` : `+${String(n)}`);

/**
 * Whether this entry is something to DO, as opposed to something that is true.
 *
 * V1's rule, and the reason a trait stays prose: Regeneration is a fact about
 * the creature and Bite is a thing you announce. Multiattack is neither — it
 * names no dice, so it reads as prose, which is right: it tells you how many
 * times to do something else.
 */
export const isActionable = (a: Entry): boolean =>
  a.attackBonus !== undefined || (a.damage?.length ?? 0) > 0;

/** "+4 to hit · 1d6+2 slashing" — the numbers, without throwing anything. */
export function actionNumbers(a: Entry): string {
  const parts: string[] = [];
  if (a.attackBonus !== undefined) parts.push(`${signed(a.attackBonus)} to hit`);
  for (const d of a.damage ?? []) {
    parts.push(`${d.dice}${d.type !== undefined && d.type !== "" ? ` ${d.type.toLowerCase()}` : ""}`);
  }
  return parts.join(" · ");
}

/** "dex +6, con +13" — saves and skills print the same way. */
export const modifierList = (m: Readonly<Record<string, number>> | null | undefined): string =>
  m === null || m === undefined
    ? ""
    : Object.entries(m).map(([k, v]) => `${k} ${signed(v)}`).join(", ");

/**
 * The speed line.
 *
 * The corpus puts the WHOLE line under a single `walk` key — every one of
 * 6,633 creatures, so a dragon reads `{walk: "walk 40 ft., climb 40 ft., fly
 * 80 ft."}`. Printing key and value the way V1 did would say "walk walk 40
 * ft.". The values already contain their own labels, so print those.
 */
export const speedText = (speed: Readonly<Record<string, string>>): string =>
  Object.values(speed).filter((v) => v !== "").join(", ");

/** Senses arrive as a string on some creatures and `{notes}` on others. */
export const sensesText = (senses: string | { readonly notes?: string } | null | undefined): string =>
  typeof senses === "string" ? senses : (senses?.notes ?? "");

/** The ability scores, in the order every statblock in print uses. */
export const ABILITIES = ["str", "dex", "con", "int", "wis", "cha"] as const;

/** A score's modifier, signed, because that is the number a DM adds. */
export const abilityMod = (score: number): string => signed(Math.floor((score - 10) / 2));
