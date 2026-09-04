import { fold } from "../../core/fold";
import type { Event } from "../../core/types";
import type { Item, WeaponProperty } from "../../rules/5e/items";

export const HOMEBREW = "homebrew.act";

/**
 * A thing somebody made up, that the app reads as a thing.
 *
 * A magic sword handed out at the table existed as a line in somebody's
 * notes: it could not be carried, equipped, swung, weighed or priced, and the
 * app had no idea it was a weapon. The point of this file is that it produces
 * the SAME shape the compendium produces — not a parallel "custom item" type
 * with its own half of the rules — so everything downstream works without
 * being told about homebrew at all.
 *
 * **That is the whole test.** Equip it and the armour class moves; swing it
 * and the damage is right; give it "versatile" and both grips appear. None of
 * those code paths know this file exists, and `scripts/checks/homebrew.mjs`
 * fails the build if one of them learns.
 *
 * The mechanism is one line in `App.tsx`: what a sheet is handed as its
 * catalogue is the compendium's items followed by these. Nothing after that
 * point can tell them apart, because there is nothing to tell apart —
 * `findItem`, `bucketOf`, `wornFrom` and `attackFromWeapon` are all reading
 * the same record type either way.
 *
 * The LOG holds the finished `Item`, not the draft, which is V1's call and
 * the strongest form of the same idea: what is stored is already a catalogue
 * record. `toDraft` exists so one can be edited without being retyped.
 *
 * What the form asks for is what the shape needs and nothing more. Somebody
 * writing a sword at eleven at night is not going to fill in a weight they
 * will never read — so weight is optional, and the fields that ARE required
 * are the ones the rules read.
 *
 * Ported from V1's `domain/homebrew-item.ts`.
 */

/** What sort of thing this is, which decides what the rules read off it. */
export type HomebrewKind = "weapon" | "armour" | "shield" | "gear";

/**
 * The properties that change what the app DOES, rather than what it prints.
 *
 * Only these five, because the others are flavour nothing acts on and a list
 * of fourteen checkboxes is a form nobody finishes. Each one here changes a
 * number somewhere:
 *
 * - finesse and thrown pick which ability swings it (`attack.ts`)
 * - versatile turns on the second damage die
 * - two-handed empties the other hand (`slots.ts`)
 * - ammunition is the one that is only a note, and is here because a bow
 *   without it looks like an oversight rather than a decision
 */
export const HOMEBREW_PROPERTIES: readonly WeaponProperty[] = [
  "finesse", "thrown", "versatile", "two-handed", "ammunition",
];

export type HomebrewDraft = {
  readonly id?: string;
  readonly name: string;
  readonly kind: HomebrewKind;
  /** Copper, like every other price. See `rules/5e/money.ts`. */
  readonly cost: number;
  readonly weight?: number;
  /** Rarity, or a short qualifier — the same field the compendium uses. */
  readonly detail?: string;
  readonly magic?: boolean;

  // weapon
  readonly damage?: string;
  readonly damageType?: string;
  readonly twoHanded?: string;
  readonly ranged?: boolean;
  readonly martial?: boolean;
  readonly properties?: readonly WeaponProperty[];
  readonly rangeNormal?: number;
  readonly rangeLong?: number;

  // armour
  readonly armourWeight?: "Light" | "Medium" | "Heavy";
  readonly baseAc?: number;
  readonly stealthDisadvantage?: boolean;
  readonly strMinimum?: number;
};

/** A stable id from the name, so saving the same thing twice edits it. */
export function homebrewId(name: string): string {
  const slug = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return `hb-${slug === "" ? Date.now().toString(36) : slug}`;
}

/**
 * Turn a draft into a catalogue item.
 *
 * Every branch here exists because some rule reads the field. `category` is
 * what `isWeapon` and `isArmour` look at; `armorCategory: "Shield"` is the
 * only thing that makes a shield a shield; `dexBonus` and `maxDex` are what
 * make medium armour cap at +2 rather than silently uncapping.
 *
 * The name is marked "(HB)" so provenance survives — the same marker imported
 * homebrew carries in the compendium, so the same filters hide it and the
 * same badge shows it. **Marked once**: re-saving an edited item must not
 * produce "Sword (HB) (HB)".
 */
export function toItem(draft: HomebrewDraft): Item {
  const typed = draft.name.trim();
  const name = /\(HB\)\s*$/i.test(typed) ? typed : `${typed} (HB)`;

  const base = {
    id: draft.id ?? homebrewId(draft.name),
    name,
    cost: Math.max(0, Math.round(draft.cost)),
    ...(draft.weight !== undefined && draft.weight > 0 ? { weight: draft.weight } : {}),
    ...((draft.detail ?? "").trim() === "" ? {} : { detail: draft.detail!.trim() }),
    ...(draft.magic === true ? { magic: true as const } : {}),
  };

  if (draft.kind === "weapon") {
    const props = draft.properties ?? [];
    const two = (draft.twoHanded ?? "").trim();
    return {
      ...base,
      category: "weapon",
      weaponRange: draft.ranged === true ? "Ranged" : "Melee",
      weaponCategory: draft.martial === true ? "Martial" : "Simple",
      /* A weapon with no damage is not a weapon, so the fallbacks are real
         defaults rather than placeholders — 1d4 bludgeoning is a cudgel. */
      damage: (draft.damage ?? "").trim() === "" ? "1d4" : draft.damage!.trim(),
      damageType: (draft.damageType ?? "").trim() === "" ? "bludgeoning" : draft.damageType!.trim(),
      /* Only when it is actually versatile. A two-handed die on a weapon
         without the property would put a second grip on the sheet that the
         item does not have. */
      ...(props.includes("versatile") && two !== "" ? { twoHanded: two } : {}),
      ...(props.length > 0 ? { properties: [...props] } : {}),
      ...(draft.rangeNormal === undefined || draft.rangeNormal <= 0 ? {} : {
        range: {
          normal: draft.rangeNormal,
          ...(draft.rangeLong === undefined || draft.rangeLong <= 0 ? {} : { long: draft.rangeLong }),
        },
      }),
    };
  }

  if (draft.kind === "shield") {
    /* A shield's `baseAc` is what it ADDS, which is why 2 is the default and
       why `wornFrom` reads it under a different rule from body armour. */
    return { ...base, category: "armor", armorCategory: "Shield", baseAc: draft.baseAc ?? 2 };
  }

  if (draft.kind === "armour") {
    const weight = draft.armourWeight ?? "Light";
    return {
      ...base,
      category: "armor",
      armorCategory: weight,
      baseAc: draft.baseAc ?? 11,
      // Heavy armour ignores Dexterity entirely; medium caps it at +2.
      dexBonus: weight !== "Heavy",
      ...(weight === "Medium" ? { maxDex: 2 } : {}),
      ...(draft.strMinimum === undefined || draft.strMinimum <= 0 ? {} : { strMinimum: draft.strMinimum }),
      ...(draft.stealthDisadvantage === true ? { stealthDisadvantage: true } : {}),
    };
  }

  return { ...base, category: "adventuring-gear" };
}

/**
 * Back to a draft, so an item can be edited rather than retyped.
 *
 * The marker comes off for editing and goes back on when saved — somebody
 * should see the name they typed, not the app's bookkeeping.
 */
export function toDraft(item: Item): HomebrewDraft {
  const kind: HomebrewKind =
    item.category === "weapon" ? "weapon"
      : item.armorCategory === "Shield" ? "shield"
        : item.category === "armor" ? "armour"
          : "gear";
  return {
    id: item.id,
    name: item.name.replace(/\s*\(HB\)\s*$/i, ""),
    kind,
    cost: item.cost ?? 0,
    ...(item.weight === undefined ? {} : { weight: item.weight }),
    ...(item.detail === undefined ? {} : { detail: item.detail }),
    ...(item.magic === true ? { magic: true } : {}),
    ...(item.damage === undefined ? {} : { damage: item.damage }),
    ...(item.damageType === undefined ? {} : { damageType: item.damageType }),
    ...(item.twoHanded === undefined ? {} : { twoHanded: item.twoHanded }),
    ...(item.weaponRange === "Ranged" ? { ranged: true } : {}),
    ...(item.weaponCategory === "Martial" ? { martial: true } : {}),
    ...(item.properties === undefined ? {} : { properties: [...item.properties] }),
    ...(item.range === undefined ? {} : { rangeNormal: item.range.normal }),
    ...(item.range?.long === undefined ? {} : { rangeLong: item.range.long }),
    ...(kind === "armour" && item.armorCategory !== undefined && item.armorCategory !== "Shield"
      ? { armourWeight: item.armorCategory }
      : {}),
    ...(item.baseAc === undefined ? {} : { baseAc: item.baseAc }),
    ...(item.stealthDisadvantage === true ? { stealthDisadvantage: true } : {}),
    ...(item.strMinimum === undefined ? {} : { strMinimum: item.strMinimum }),
  };
}

export type HomebrewAct =
  | { readonly act: "save"; readonly item: Item }
  | { readonly act: "forget"; readonly id: string };

const asAct = (e: Event): HomebrewAct | null =>
  e.kind === HOMEBREW ? (e.data as unknown as HomebrewAct) : null;

function reduce(items: readonly Item[], e: Event): readonly Item[] {
  const a = asAct(e);
  if (a === null) return items;
  switch (a.act) {
    case "save":
      /* Same id replaces. The id is derived from the name, so re-saving the
         same sword edits it rather than shelving a second one. */
      return [...items.filter((x) => x.id !== a.item.id), a.item];
    case "forget":
      return items.filter((x) => x.id !== a.id);
  }
}

/**
 * Everything made up so far, as catalogue records.
 *
 * Returns `Item[]` and not a wrapper, deliberately: the caller appends this to
 * the compendium and hands the result on, and a wrapper would be a thing every
 * consumer had to unwrap and therefore know about.
 */
export const homebrewFrom = (events: readonly Event[]): readonly Item[] =>
  fold(events, reduce, [] as readonly Item[]);
