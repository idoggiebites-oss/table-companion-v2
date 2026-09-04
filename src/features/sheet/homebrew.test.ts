import { describe, it, expect } from "vitest";
import { homebrewFrom, homebrewId, toDraft, toItem, HOMEBREW, type HomebrewDraft } from "./homebrew";
import { armourClass, wornFrom } from "../../rules/5e/armour";
import { attackFromWeapon, resolveAttack } from "../../rules/5e/attack";
import { bucketOf, isArmour, isShield, isWeapon, itemFacts, type Item } from "../../rules/5e/items";
import { sourceMark } from "../../content/marks";
import { findItem } from "./carried";
import { BLANK } from "../../rules/5e/abilities";
import { asDevice, type Event } from "../../core/types";

let n = 0;
const ev = (data: Record<string, unknown>): Event =>
  ({ id: `e${String(++n)}`, kind: HOMEBREW, seq: n, by: asDevice("d1"), at: n, data } as Event);

const draft = (d: Partial<HomebrewDraft> = {}): HomebrewDraft =>
  ({ name: "Sunderer", kind: "weapon", cost: 0, ...d });

/*
 * The criterion, stated as a test: a made-up item and a compendium item with
 * the same fields must be indistinguishable to every rule that reads them.
 *
 * Each pair below runs BOTH through the same real function — not a copy of it
 * — and asserts the results are equal. `wornFrom` was pulled out of the
 * inventory screen for exactly this: a test that rebuilt the Item→Worn mapping
 * would be testing its own copy while the screen drifted.
 */
describe("a made-up thing is indistinguishable from a catalogue one", () => {
  const scores = { ...BLANK, str: 16, dex: 14 };

  it("moves an armour class through the same path", () => {
    const catalogue: Item = {
      id: "breastplate", name: "Breastplate", category: "armor",
      armorCategory: "Medium", baseAc: 14, dexBonus: true, maxDex: 2,
    };
    const made = toItem(draft({
      name: "Dwarven Breastplate", kind: "armour", armourWeight: "Medium", baseAc: 14,
    }));
    const a = armourClass(wornFrom([catalogue]), scores);
    const b = armourClass(wornFrom([made]), scores);
    /* 14 + 2, not 14 + 2 for one and 14 + dex uncapped for the other: `maxDex`
       is set by `toItem` because medium armour that silently uncaps is the
       quiet way to be two points wrong for a whole campaign. */
    expect(a.value).toBe(16);
    expect(b.value).toBe(a.value);
    expect(b.speedPenalty).toBe(a.speedPenalty);
  });

  it("and a shield ADDS, rather than replacing", () => {
    /* 10 unarmoured + 2 dexterity + 2 shield. A shield's `baseAc` is a bonus
       and not a base, which is the one thing `toItem` must get right about it
       — 12 here would mean it had replaced the body's armour class. */
    const made = toItem(draft({ name: "Kite", kind: "shield" }));
    expect(armourClass(wornFrom([made]), scores).value).toBe(14);
    /* And on top of armour rather than instead of it. */
    const plate = toItem(draft({ name: "Plate", kind: "armour", armourWeight: "Heavy", baseAc: 18 }));
    expect(armourClass(wornFrom([plate, made]), scores).value).toBe(20);
  });

  it("derives to-hit and damage through the same path", () => {
    const w = { name: "Longsword", range: "Melee" as const, damage: "1d8 slashing", properties: ["versatile"] };
    const made = toItem(draft({
      name: "Sunderer", damage: "1d8", damageType: "slashing",
      properties: ["versatile"], twoHanded: "1d10",
    }));
    const fromCatalogue = resolveAttack(attackFromWeapon(w, true), scores, 2);
    const fromMade = resolveAttack(attackFromWeapon({
      name: made.name, damage: `${made.damage!} ${made.damageType!}`,
      properties: made.properties ?? [],
      ...(made.weaponRange === undefined ? {} : { range: made.weaponRange }),
    }, true), scores, 2);
    expect(fromMade.toHit).toBe(fromCatalogue.toHit);
    expect(fromMade.damage).toBe(fromCatalogue.damage);
    expect(fromMade.damageType).toBe(fromCatalogue.damageType);
  });

  it("finesse picks dexterity, exactly as the compendium's does", () => {
    const made = toItem(draft({ name: "Whisper", damage: "1d4", damageType: "piercing", properties: ["finesse"] }));
    const a = attackFromWeapon({ name: made.name, damage: "1d4 piercing", properties: made.properties ?? [] }, true);
    expect(a.ability).toBe("finesse");
  });

  it("sorts into the same bucket, and answers the same questions", () => {
    expect(bucketOf(toItem(draft()))).toBe("weapons");
    expect(bucketOf(toItem(draft({ kind: "armour" })))).toBe("armor");
    expect(bucketOf(toItem(draft({ kind: "shield" })))).toBe("armor");
    expect(bucketOf(toItem(draft({ name: "Rope", kind: "gear" })))).toBe("gear");
    expect(isWeapon(toItem(draft()))).toBe(true);
    expect(isShield(toItem(draft({ kind: "shield" })))).toBe(true);
    expect(isArmour(toItem(draft({ kind: "armour" })))).toBe(true);
    /* A shield is armour by category and NOT by `isArmour`, which is the
       distinction `wornFrom` depends on. */
    expect(isArmour(toItem(draft({ kind: "shield" })))).toBe(false);
  });

  it("describes itself out of the same fields", () => {
    const facts = itemFacts(toItem(draft({
      damage: "1d8", damageType: "slashing", martial: true,
      properties: ["thrown"], rangeNormal: 20, rangeLong: 60,
    })));
    expect(facts).toContain("1d8 slashing");
    expect(facts).toContain("Martial melee weapon");
    expect(facts).toContain("range 20/60 ft");
  });
});

describe("the marker", () => {
  it("is the compendium's own, so the same filters and badges apply", () => {
    /* Not a private flag. `content/marks.ts` reads "(HB)" as provenance for
       imported material, and a made-up item is marked so it flows through
       that same machinery rather than needing a second one. */
    expect(sourceMark(toItem(draft()).name)).toBe("HB");
  });

  it("goes on once, however many times a thing is edited", () => {
    const once = toItem(draft());
    const again = toItem(toDraft(once));
    expect(once.name).toBe("Sunderer (HB)");
    expect(again.name).toBe("Sunderer (HB)");
  });

  it("comes off for editing, because you should see the name you typed", () => {
    expect(toDraft(toItem(draft())).name).toBe("Sunderer");
  });

  it("keeps the id stable, so re-saving edits rather than shelving a second", () => {
    expect(homebrewId("Sunderer")).toBe("hb-sunderer");
    expect(toItem(toDraft(toItem(draft()))).id).toBe(toItem(draft()).id);
  });
});

describe("what the form is allowed to leave out", () => {
  it("gives a weapon a real default rather than a placeholder", () => {
    const i = toItem(draft({ damage: "", damageType: "" }));
    expect(i.damage).toBe("1d4");
    expect(i.damageType).toBe("bludgeoning");
  });

  it("puts no second grip on a weapon that is not versatile", () => {
    /* A two-handed die on a weapon without the property would show a grip the
       item does not have. */
    expect(toItem(draft({ twoHanded: "1d10" })).twoHanded).toBeUndefined();
    expect(toItem(draft({ twoHanded: "1d10", properties: ["versatile"] })).twoHanded).toBe("1d10");
  });

  it("caps a medium armour's dexterity and ignores a heavy one's", () => {
    expect(toItem(draft({ kind: "armour", armourWeight: "Medium" })).maxDex).toBe(2);
    expect(toItem(draft({ kind: "armour", armourWeight: "Heavy" })).dexBonus).toBe(false);
    expect(toItem(draft({ kind: "armour", armourWeight: "Light" })).maxDex).toBeUndefined();
  });

  it("omits a range nobody gave it rather than inventing zero feet", () => {
    expect(toItem(draft()).range).toBeUndefined();
    expect(toItem(draft({ rangeNormal: 20 })).range).toEqual({ normal: 20 });
  });
});

describe("keeping them", () => {
  it("saves, edits in place, and lets go", () => {
    const a = toItem(draft());
    expect(homebrewFrom([ev({ act: "save", item: a })])).toHaveLength(1);
    const edited = toItem(draft({ detail: "rare" }));
    expect(homebrewFrom([
      ev({ act: "save", item: a }), ev({ act: "save", item: edited }),
    ])).toEqual([edited]);
    expect(homebrewFrom([
      ev({ act: "save", item: a }), ev({ act: "forget", id: a.id }),
    ])).toEqual([]);
  });

  it("loses to the compendium on an exact name, so equipment lines still resolve", () => {
    /*
     * A made-up "Longsword" must not be what a fighter's "a longsword" line
     * picks up. The compendium is merged first and `findItem` takes the first
     * exact match, so the real one wins.
     */
    const real: Item = { id: "longsword", name: "Longsword", category: "weapon" };
    const mine = toItem(draft({ name: "Longsword" }));
    expect(findItem("longsword", [real, mine])?.id).toBe("longsword");
  });
});
