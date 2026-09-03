import { modifier, type Scores } from "./abilities";

/**
 * What being armoured actually does to the numbers.
 *
 * Ported from V1's `domain/equipment.ts`, which had this right and had it
 * documented. Until now V2 said the unarmoured case for everybody, plainly,
 * because the build carried three equipment ids nobody read. It carries the
 * class's own equipment lines now, so a knight in plate printing 12 is not
 * "right about what it knows" — it is wrong.
 *
 * The rule has three shapes and the compendium states which one applies:
 *
 *   light   base + Dex, uncapped          leather 11, studded leather 12
 *   medium  base + Dex, capped at 2       scale mail 14, half plate 15
 *   heavy   base, Dex ignored entirely    chain mail 16, plate 18
 *
 * A shield adds its own value on top of any of them, including unarmoured.
 *
 * **`from` is not decoration.** V1 carried a readable derivation beside the
 * number because a capped Dexterity bonus is the most common reason a
 * player's own arithmetic disagrees with the sheet, and a bare 16 cannot
 * settle it. Law 6: what the app knows, it says, at the moment it applies.
 */
export type Kind = "light" | "medium" | "heavy" | "shield";

export type Worn = {
  readonly name: string;
  readonly kind: Kind;
  /** Base armour class, or the bonus a shield adds. */
  readonly ac: number;
  /** The most Dexterity this armour lets through. Absent means uncapped. */
  readonly maxDex?: number;
  /** Heavy armour you lack the Strength for costs ten feet of speed. */
  readonly strMinimum?: number;
  readonly stealthDisadvantage?: boolean;
};

export type ArmourClass = {
  readonly value: number;
  /** The sum in words — "Chain Mail 16", "Leather Armor 11 + dex +3". */
  readonly from: string;
  readonly speedPenalty: number;
  readonly stealthDisadvantage: boolean;
};

/**
 * The unarmoured floor.
 *
 * V1's note, carried because it will matter again: a monk's unarmoured
 * defence, a draconic sorcerer's scales and every imported sheet's bracers are
 * AC rules this app does not model, and recomputing from 10 + Dex would
 * silently strip them. Body armour explicitly overrides whatever unarmoured
 * rule you had; a shield adds to it either way. When V2 grows a place to
 * store one, it plugs in HERE, as the floor — not as a replacement.
 */
export const UNARMOURED = 10;

export function armourClass(worn: readonly Worn[], scores: Scores): ArmourClass {
  const dexMod = modifier(scores.dex);
  const shields = worn.filter((w) => w.kind === "shield");
  const shieldAc = shields.reduce((n, s) => n + s.ac, 0);

  /*
   * The best suit AS WORN, not the highest printed base: scale mail is 14 to
   * leather's 11, and a Dexterity of 20 makes leather the better armour.
   *
   * V1 took the first equipped instead, which was right there — the player
   * had equipped it. V2 has no equip step yet, only the lines chosen at
   * creation, where "first" is an artefact of the order the book prints them.
   */
  const body = worn
    .filter((w) => w.kind !== "shield")
    .reduce<Worn | undefined>((a, b) => (a === undefined || asWorn(b, dexMod) > asWorn(a, dexMod) ? b : a), undefined);

  let value: number;
  let from: string;
  if (body === undefined) {
    value = UNARMOURED + dexMod + shieldAc;
    from = `${String(UNARMOURED)} unarmoured${dexMod === 0 ? "" : ` ${signed(dexMod)} dex`}`;
  } else {
    const dex = allowed(body, dexMod);
    value = body.ac + dex + shieldAc;
    from = `${body.name} ${String(body.ac)}${dex === 0 ? "" : ` ${signed(dex)} dex`}`;
    // A capped bonus is worth saying out loud; an ignored one even more so.
    if (body.kind === "heavy" && dexMod !== 0) from += " (dex does not apply)";
    else if (body.maxDex !== undefined && dexMod > body.maxDex) from += ` (dex capped at +${String(body.maxDex)})`;
  }

  for (const s of shields) from += ` + ${s.name} ${signed(s.ac)}`;

  const short = body?.strMinimum !== undefined && scores.str < body.strMinimum;
  return {
    value,
    from,
    speedPenalty: short ? 10 : 0,
    stealthDisadvantage: worn.some((w) => w.stealthDisadvantage === true),
  };
}

const signed = (n: number) => (n < 0 ? `−${String(Math.abs(n))}` : `+${String(n)}`);

/** How much Dexterity this suit lets through. */
const allowed = (w: Worn, dex: number): number =>
  w.kind === "heavy" ? 0 : w.maxDex === undefined ? dex : Math.min(dex, w.maxDex);

const asWorn = (w: Worn, dex: number): number => w.ac + allowed(w, dex);

/** Whether anything is worn. A shield on its own is not being armoured. */
export const isArmoured = (worn: readonly Worn[]): boolean =>
  worn.some((w) => w.kind !== "shield");
