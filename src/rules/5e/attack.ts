import { modifier, signed, type Ability, type Scores } from "./abilities";

/**
 * Attacks.
 *
 * Ported from V1's `domain/attack.ts`, and its central claim is the reason:
 * **the attack bonus is DERIVED, never stored.** When proficiency goes from +3
 * to +4 at level 9, every attack on the sheet has to move with it, and a
 * stored number is one that silently stays wrong for months. The same is true
 * of the damage line.
 *
 * Two cases the model has to carry properly, because they are the ones people
 * get wrong by hand:
 *
 *   - **Finesse takes the better** of Strength and Dexterity, so it cannot be
 *     stored as one ability. This is why `index/weapon.json` had to start
 *     carrying `properties` — without it a rapier reads from Strength, which
 *     is wrong for the most ordinary character in the game.
 *   - **An off-hand attack adds no ability modifier to its damage**, which is
 *     why damage carries a flag rather than assuming the modifier applies.
 */

/** Which ability swings it. "finesse" means the better of the two. */
export type AttackAbility = "str" | "dex" | "finesse";

export type Attack = {
  readonly name: string;
  readonly ability: AttackAbility;
  readonly proficient: boolean;
  /** A magic weapon's bonus, added to both the attack roll and the damage. */
  readonly bonus: number;
  readonly damage: {
    readonly count: number;
    readonly die: number;
    /** Off-hand attacks add no ability modifier to damage. */
    readonly addAbility: boolean;
  };
  readonly damageType: string;
  readonly range?: "Melee" | "Ranged";
};

export type ResolvedAttack = {
  readonly name: string;
  readonly toHit: number;
  /** The ability that ended up being used, once finesse is settled. */
  readonly usedAbility: Ability;
  readonly damage: string;
  readonly damageType: string;
  readonly range?: "Melee" | "Ranged";
};

export function abilityFor(attack: Attack, scores: Scores): Ability {
  if (attack.ability !== "finesse") return attack.ability;
  return modifier(scores.dex) >= modifier(scores.str) ? "dex" : "str";
}

/** "1d8+4", "2d6", "1d6-1" — never a bare "+0". */
export function damageFormula(count: number, die: number, flat: number): string {
  const dice = `${String(count)}d${String(die)}`;
  if (flat === 0) return dice;
  return `${dice}${flat < 0 ? "-" : "+"}${String(Math.abs(flat))}`;
}

export function resolveAttack(attack: Attack, scores: Scores, proficiencyBonus: number): ResolvedAttack {
  const used = abilityFor(attack, scores);
  const mod = modifier(scores[used]);
  const toHit = mod + attack.bonus + (attack.proficient ? proficiencyBonus : 0);
  const flat = (attack.damage.addAbility ? mod : 0) + attack.bonus;
  return {
    name: attack.name,
    toHit,
    usedAbility: used,
    damage: damageFormula(attack.damage.count, attack.damage.die, flat),
    damageType: attack.damageType,
    ...(attack.range === undefined ? {} : { range: attack.range }),
  };
}

/** One line, the way a sheet prints it. */
export const describeAttack = (a: ResolvedAttack): string => `${a.damage} ${a.damageType}`;
export const attackLabel = (a: ResolvedAttack): string => `${a.name} ${signed(a.toHit)}`;

/**
 * A weapon as the compendium writes it, read into an attack.
 *
 * `damage` arrives as one string — "1d8 piercing", and for a blowgun just
 * "1 piercing", which has no die at all and is why the count/die parse has to
 * tolerate its absence rather than assume a d-something.
 */
export function attackFromWeapon(
  w: { name: string; range?: "Melee" | "Ranged"; damage: string; properties: readonly string[] },
  proficient: boolean,
): Attack {
  const props = w.properties.map((p) => p.toLowerCase());
  const m = /^(\d+)d(\d+)/.exec(w.damage.trim());
  const type = w.damage.replace(/^\s*\d+(d\d+)?\s*/, "").trim();
  return {
    name: w.name,
    /* Ranged is Dexterity, finesse is the better of the two, everything else
       is Strength. A thrown melee weapon still swings on Strength unless it is
       also finesse, which is the dagger's whole trick. */
    ability: props.includes("finesse") ? "finesse" : w.range === "Ranged" ? "dex" : "str",
    proficient,
    bonus: 0,
    damage: {
      count: m === null ? 1 : Number(m[1]),
      /* A blowgun deals "1 piercing" — one point, no die. Treated as a d1 so
         the formula stays one shape; the alternative was a second kind of
         damage line for two weapons in the whole book. */
      die: m === null ? 1 : Number(m[2]),
      addAbility: true,
    },
    damageType: type === "" ? "damage" : type,
    ...(w.range === undefined ? {} : { range: w.range }),
  };
}
