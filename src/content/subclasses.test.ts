import { describe, it, expect } from "vitest";
import { pathsOf, grantName, classSource, type ClassRecord, stylesOf } from "./subclasses";
import { provenanceOf } from "./source";

/* Shaped exactly like the compendium's class records: subclasses exist only as
   features named "<Grant>: <Subclass>", and a class's other level-1 choices sit
   in the same list. */
const fighter: ClassRecord = {
  name: "Fighter",
  features: [
    { level: 1, name: "Fighting Style" },
    { level: 1, name: "Fighting Style: Archery" },
    { level: 1, name: "Fighting Style: Defense" },
    { level: 1, name: "Second Wind" },
    { level: 3, name: "Martial Archetype" },
    { level: 3, name: "Martial Archetype: Champion" },
    { level: 3, name: "Improved Critical (Champion)" },
    { level: 3, name: "Martial Archetype: Battle Master" },
    { level: 3, name: "Martial Archetype: Pyromancer (HB)" },
  ],
};

describe("subclasses are derived from the class's own features", () => {
  it("reads the paths a class offers at the level it offers them", () => {
    const paths = pathsOf(fighter, 3);
    expect(paths.map((p) => p.name)).toEqual(["Champion", "Battle Master", "Pyromancer (HB)"]);
    expect(grantName(fighter, 3)).toBe("Martial Archetype");
  });

  it("does not mistake a fighting style for a subclass", () => {
    // Taking the earliest "X: Y" feature gives Fighter a subclass of Archery
    // at level 1, and Paladin the same, and Ranger a Deft Explorer. The level
    // is rules knowledge; only the list is data.
    const wrong = pathsOf(fighter, 1);
    expect(wrong.map((p) => p.name)).toEqual(["Archery", "Defense"]);
    expect(pathsOf(fighter, 3).map((p) => p.name)).not.toContain("Archery");
  });

  it("ignores a subclass's later features", () => {
    // "Improved Critical (Champion)" is a feature OF Champion, not a path.
    expect(pathsOf(fighter, 3).map((p) => p.name)).not.toContain("Improved Critical");
  });

  it("marks somebody else's path and leaves the game's own alone", () => {
    const paths = pathsOf(fighter, 3);
    expect(paths.find((p) => p.name === "Champion")!.provenance.tier).toBe("unknown");
    expect(paths.find((p) => p.name.startsWith("Pyromancer"))!.provenance.tier).toBe("homebrew");
  });

  it("offers nothing for a class that states no paths", () => {
    expect(pathsOf({ name: "Nobody", features: [] }, 3)).toEqual([]);
    expect(grantName({ name: "Nobody", features: [] }, 3)).toBeNull();
  });
});

describe("a source line is not a claim to be official", () => {
  const mercer: ClassRecord = {
    name: "Fighter",
    features: [
      { level: 1, name: "Starting Fighter", text: "Source:\tPlayer's Handbook (2014) p. 70" },
      { level: 3, name: "Martial Archetype: Champion", text: "Source:\tPlayer's Handbook (2014) p. 72" },
      { level: 3, name: "Martial Archetype: Gunslinger",
        text: "Source:\tMatthew Mercer - Gunslinger Martial Archetype 1.3 p. 1" },
      { level: 3, name: "Martial Archetype: Purple Dragon Knight (Banneret)",
        text: "Source:\tSword Coast Adventurer's Guide p. 128" },
      { level: 3, name: "Martial Archetype: Knighthood (Purple Dragon Knight (Banneret))",
        text: "Source:\tSword Coast Adventurer's Guide p. 128" },
    ],
  };

  it("marks a path whose publisher matches no book of the game's", () => {
    const paths = pathsOf(mercer, 3);
    const gunslinger = paths.find((p) => p.name === "Gunslinger")!;
    // V1 showed this among the fighter's archetypes: it carries a source line
    // and no name marker, and V1 only ever read name markers.
    expect(gunslinger.provenance.tier).not.toBe("official");
    expect(gunslinger.provenance.book).toBeNull();
  });

  it("keeps an official path published outside the core nineteen", () => {
    const pdk = pathsOf(mercer, 3).find((p) => p.name.startsWith("Purple Dragon"))!;
    expect(pdk.provenance.tier).toBe("official");
    expect(pdk.provenance.book).toBe("scag");
  });

  it("drops a subclass's own feature, however deeply bracketed", () => {
    // "Knighthood (Purple Dragon Knight (Banneret))" wears the same prefix as
    // the path that declares it. A greedy regex reads the qualifier as
    // beginning at the FIRST bracket and lets it through.
    expect(pathsOf(mercer, 3).map((p) => p.name)).not.toContain(
      "Knighthood (Purple Dragon Knight (Banneret))",
    );
    expect(pathsOf(mercer, 3)).toHaveLength(3);
  });
});

describe("a class states its own source, not its subclasses'", () => {
  const withStarting = (name: string, starting: string, rest: string): ClassRecord => ({
    name,
    features: [
      { level: 1, name: `Starting ${name}`, text: `Source:\t${starting}` },
      { level: 1, name: `Multiclass ${name}`, text: "Source:\tPlayer's Handbook (2014) p. 163" },
      ...Array.from({ length: 40 }, (_, i) => ({
        level: 3, name: `Path: Thing ${i}`, text: `Source:\t${rest}`,
      })),
    ],
  });

  it("asks the Starting feature, not the commonest one", () => {
    // A cleric's list holds 198 subclasses, so the commonest source in it is
    // somebody's homebrew — which quietly removed the Cleric from the game.
    const cleric = withStarting("Cleric", "Player's Handbook (2014) p. 58", "Valda's Spire of Secrets");
    expect(provenanceOf("Cleric", classSource(cleric)).book).toBe("phb");
  });

  it("does not mistake multiclassing boilerplate for a source", () => {
    // Every homebrew class carries a "Multiclass X" feature quoting the PHB.
    const homebrew: ClassRecord = {
      name: "Blood Hunter",
      features: [
        { level: 1, name: "Multiclass Blood Hunter", text: "Source:\tPlayer's Handbook (2014) p. 163" },
        { level: 1, name: "Hunter's Bane", text: "Source:\tTasha's Hideous Leftovers p. 10 (Indie)" },
        { level: 2, name: "Blood Maledict", text: "Source:\tTasha's Hideous Leftovers p. 11 (Indie)" },
      ],
    };
    const p = provenanceOf("Blood Hunter", classSource(homebrew));
    expect(p.tier).toBe("indie");
    expect(p.book).toBeNull();
  });
});

describe("fighting styles, derived the same way paths are", () => {
  const FIGHTER = {
    id: "fighter", name: "Fighter",
    features: [
      { level: 1, name: "Fighting Style", text: "You adopt a particular style. Source:\tPlayer's Handbook (2014) p. 72" },
      { level: 1, name: "Fighting Style: Archery", text: "+2 to ranged attacks. Source:\tPlayer's Handbook (2014) p. 72" },
      { level: 1, name: "Fighting Style: Defense", text: "+1 AC. Source:\tPlayer's Handbook (2014) p. 72" },
      { level: 1, name: "Fighting Style: Blind Fighting (HB)", text: "Blindsight. Source:\tSomebody's Homebrew" },
      // A Champion picks a second at ten. That is a level-up question.
      { level: 10, name: "Fighting Style: Archery (Champion)", text: "Source:\tPlayer's Handbook (2014) p. 72" },
      { level: 3, name: "Martial Archetype: Champion", text: "Source:\tPlayer's Handbook (2014) p. 72" },
    ],
  };

  it("takes the level the class states, not one that was assumed", () => {
    expect(stylesOf(FIGHTER)?.level).toBe(1);
    expect(stylesOf({ ...FIGHTER, features: FIGHTER.features.map((f) => ({ ...f, level: f.level === 1 ? 2 : f.level })) })?.level)
      .toBe(2);
  });

  it("offers only the grant at that level, not the one at ten", () => {
    const names = stylesOf(FIGHTER)!.options.map((o) => o.name);
    expect(names).toEqual(["Archery", "Defense", "Blind Fighting (HB)"]);
  });

  it("does not mistake the feature that announces the choice for one of them", () => {
    expect(stylesOf(FIGHTER)!.options.map((o) => o.name)).not.toContain("Fighting Style");
  });

  it("does not mistake a path for a style", () => {
    expect(stylesOf(FIGHTER)!.options.map((o) => o.name)).not.toContain("Champion");
  });

  it("carries each style's own provenance, so homebrew hides like everything else", () => {
    const marked = stylesOf(FIGHTER)!.options.find((o) => o.name === "Blind Fighting (HB)");
    expect(marked!.provenance.tier).toBe("homebrew");
  });

  it("says nothing for the ten classes that never adopt one", () => {
    expect(stylesOf({ id: "wizard", features: [{ level: 2, name: "Arcane Tradition: School of Evocation" }] }))
      .toBeNull();
  });
});
