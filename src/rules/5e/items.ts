/**
 * Items, and what a character is carrying.
 *
 * Ported from V1's `domain/items.ts`. Two shapes, deliberately separate:
 *
 *   - `Item` is a CATALOGUE record — the compendium's longsword, the same for
 *     everyone, loaded from data and never written to.
 *   - `Stack` is what a character actually has. It carries the item's name
 *     alongside its id, which is denormalisation on purpose: the DM hands out
 *     "a tarnished key" that is in no catalogue, and a log replayed on a
 *     device that has not loaded the item file still has to be readable.
 *
 * What is equipped is a SET of item ids held apart from quantities, rather
 * than a flag on the stack. Equipping does not change how many you own, and
 * making it a flag forces a stack of two daggers to split the moment one is
 * drawn — which then has to merge again on sheathing, and stops merging
 * correctly the first time one of them picks up a note.
 */

export type WeaponProperty = string;

export type Item = {
  readonly id: string;
  readonly name: string;
  /** "weapon", "armor", "adventuring-gear", "tools", "mounts-and-vehicles". */
  readonly category: string;
  /** In copper, because nothing here is a decimal. */
  readonly cost?: number;
  readonly weight?: number;

  readonly weaponRange?: "Melee" | "Ranged";
  readonly weaponCategory?: "Simple" | "Martial";
  readonly damage?: string;
  readonly damageType?: string;
  /** How far it throws or shoots, in feet. Normal, then long if it has one. */
  readonly range?: { readonly normal: number; readonly long?: number };
  /** Versatile: the die when it is swung in two hands. */
  readonly twoHanded?: string;
  readonly properties?: readonly WeaponProperty[];

  readonly armorCategory?: "Light" | "Medium" | "Heavy" | "Shield";
  readonly baseAc?: number;
  readonly dexBonus?: boolean;
  readonly maxDex?: number;
  readonly strMinimum?: number;
  readonly stealthDisadvantage?: boolean;

  readonly magic?: true;
  /** "common", "rare", "legendary" — rarity, or a short qualifier. */
  readonly detail?: string;
};

export type Stack = {
  readonly itemId: string;
  /** Denormalised, so a granted item survives without the catalogue. */
  readonly name: string;
  readonly qty: number;
  /** What makes one of a kind different from another — "+1", "cracked". */
  readonly note?: string;
};

export const isWeapon = (i: Item): boolean => i.category === "weapon";
export const isShield = (i: Item): boolean => i.armorCategory === "Shield";
export const isArmour = (i: Item): boolean =>
  i.category === "armor" && i.armorCategory !== "Shield";
export const hasProperty = (i: Item, p: WeaponProperty): boolean =>
  (i.properties ?? []).includes(p);

/** The four the sheet sorts by. Anything else is gear. */
export type Bucket = "weapons" | "armor" | "gear" | "consumables";

/**
 * Which tab a thing belongs under.
 *
 * The compendium has no "consumable" category — potions, scrolls and ammunition
 * are all "adventuring-gear" — so that one is read off the name, which is the
 * only signal there is. Anything unrecognised is gear, which is where a rope
 * and a tarnished key both belong.
 */
export function bucketOf(i: Item): Bucket {
  if (isWeapon(i)) return "weapons";
  if (i.category === "armor") return "armor";
  // Plurals count: the catalogue says "Arrows (20)", not "Arrow".
  if (/\b(potions?|elixirs?|philters?|oils?|scrolls?|rations?|antitoxins?|acids?|alchemist's fire|holy water|poisons?|ammunition|arrows?|bolts?|bullets?|needles?|darts?)\b/i
    .test(i.name)) return "consumables";
  return "gear";
}

/**
 * Everything the app knows about a thing, in lines.
 *
 * There is no prose to show: **not one of the 10,760 items in the compendium
 * carries a description**, so this is assembled from the fields rather than
 * quoted — and it says so, because an empty panel reads as a bug while "the
 * data does not have this" reads as a fact.
 */
export function itemFacts(i: Item): readonly string[] {
  const out: string[] = [];
  out.push(i.detail !== undefined && i.detail !== "common" ? `${i.category} · ${i.detail}` : i.category);
  if (i.damage !== undefined) {
    out.push(`${i.damage} ${i.damageType?.toLowerCase() ?? "damage"}`
      + (i.twoHanded === undefined ? "" : `, or ${i.twoHanded} in two hands`));
    if (i.weaponCategory !== undefined) {
      out.push(`${i.weaponCategory} ${i.weaponRange?.toLowerCase() ?? ""} weapon`.trim());
    }
    /* V1 prints this and V2 had dropped it. A longbow that says "martial
       ranged weapon" and never says 150/600 has withheld the one number that
       decides whether the shot is possible. */
    if (i.range !== undefined) {
      out.push(`range ${String(i.range.normal)}${i.range.long === undefined ? "" : `/${String(i.range.long)}`} ft`);
    }
  }
  if (i.properties !== undefined && i.properties.length > 0) out.push(i.properties.join(", "));
  if (i.baseAc !== undefined) {
    out.push(isShield(i)
      ? `+${String(i.baseAc)} to armour class`
      : `armour class ${String(i.baseAc)}${i.dexBonus === true ? " + dexterity" : ""}`);
    if (i.stealthDisadvantage === true) out.push("disadvantage on Stealth");
  }
  if (i.weight !== undefined && i.weight > 0) out.push(`${String(i.weight)} lb`);
  return out;
}

/** What a pile of stacks weighs, for the carry line. */
export const weightOf = (
  stacks: readonly Stack[],
  of: (id: string) => Item | undefined,
): number => stacks.reduce((n, s) => n + (of(s.itemId)?.weight ?? 0) * s.qty, 0);

/**
 * What a character can carry: Strength × 15, which is the rule as written.
 * Not a limit the app enforces — it is a number the table reads.
 */
export const carryLimit = (strength: number): number => strength * 15;
