import { describe, it, expect } from "vitest";
import { Clock } from "../../core/log";
import { asDevice, type Event } from "../../core/types";
import { primary, CHOICE } from "./model";
import { buildFrom, charactersIn } from "./log";
import type { Choice } from "./choices";
import { adopt, toSheet, fromSheet } from "./transfer";
import { BLANK } from "../../rules/5e/abilities";

const build = () => {
  const c = new Clock(asDevice("dev"));
  const events: Event[] = [];
  const choose = (choice: Choice) => {
    const e = c.issue(CHOICE, choice as unknown as Record<string, unknown>);
    events.push(e);
    return e;
  };
  return { c, events, choose };
};

describe("importing takes a character in as our own", () => {
  const made = () => {
    const c = new Clock(asDevice("them"));
    const events: Event[] = [
      c.issue(CHOICE, { step: "ancestry", race: "elf", character: "theirs" }),
      c.issue(CHOICE, { step: "class", klass: "wizard", character: "theirs" }),
    ];
    return { c, events };
  };

  it("re-keys the events so importing twice makes two characters", () => {
    const { events } = made();
    const mine = new Clock(asDevice("me"));
    const first = adopt(fromSheet(JSON.parse(JSON.stringify(toSheet(events)))), mine, "one");
    const second = adopt(fromSheet(JSON.parse(JSON.stringify(toSheet(events)))), mine, "two");
    const all = [...first, ...second];

    expect(new Set(all.map((e) => e.id)).size).toBe(all.length); // no id collisions
    expect(charactersIn(all).map((c) => c.id).sort()).toEqual(["one", "two"]);
    expect(buildFrom(all, "one").race).toBe("elf");
    expect(buildFrom(all, "two").race).toBe("elf");
  });

  it("carries the undo across, pointing at the re-keyed event", () => {
    const { c, events } = made();
    events.push(c.undo(events[1]!.id)); // take back the class
    const mine = new Clock(asDevice("me"));
    const adopted = adopt(fromSheet(JSON.parse(JSON.stringify(toSheet(events)))), mine, "one");

    // The marker was remapped, so the class is still undone here.
    expect(primary(buildFrom(adopted, "one"))).toBeNull();
    expect(buildFrom(adopted, "one").race).toBe("elf");
    // And it points at an event that actually exists in this log.
    const skip = adopted.find((e) => e.kind === "skip")!;
    expect(adopted.some((e) => e.id === skip.data["target"])).toBe(true);
  });

  it("round-trips a character out and back into an identical build", () => {
    const { events } = made();
    const mine = new Clock(asDevice("me"));
    const adopted = adopt(fromSheet(JSON.parse(JSON.stringify(toSheet(events)))), mine, "one");
    expect(buildFrom(adopted, "one")).toEqual(buildFrom(events, "theirs"));
  });
});

describe("a character can get back out", () => {
  const full = () => {
    const b = build();
    b.choose({ step: "ancestry", race: "elf" });
    b.choose({ step: "subrace", subrace: "high-elf" });
    b.choose({ step: "class", klass: "wizard" });
    b.choose({ step: "level", level: 7 });
    b.choose({ step: "subclass", subclass: "evocation" });
    b.choose({ step: "abilities", method: "point-buy", scores: { ...BLANK, int: 15, dex: 14 } });
    b.choose({ step: "background", background: "sage" });
    b.choose({ step: "skills", skills: ["arcana", "history"] });
    b.choose({ step: "equipment", equipment: ["dagger", "spellbook"] });
    b.choose({ step: "spells", spells: ["fire-bolt", "mage-hand", "shield"] });
    b.choose({ step: "identity", identity: { name: "Aelar Voss", pronouns: "he/him" } });
    return b;
  };

  it("round-trips through export and import to an identical build", () => {
    const { events } = full();
    const reimported = fromSheet(JSON.parse(JSON.stringify(toSheet(events))));
    expect(buildFrom(reimported)).toEqual(buildFrom(events));
  });

  it("carries the undo markers, so an exported character is not silently re-done", () => {
    const { c, events, choose } = full();
    const skill = choose({ step: "skills", skills: ["deception"] });
    events.push(c.undo(skill.id));
    const reimported = fromSheet(JSON.parse(JSON.stringify(toSheet(events))));
    expect(buildFrom(reimported).skills).toEqual(["arcana", "history"]);
  });

  it("refuses a compendium and says where it should go", () => {
    expect(() => fromSheet({ compendium: [] })).toThrow(/not a character file/i);
    expect(() => fromSheet({ compendium: [] })).toThrow(/Import Content/);
  });

  it("refuses a version it cannot read, rather than guessing", () => {
    expect(() => fromSheet({ format: "table-companion/character", version: 9, events: [] })).toThrow(/version 9/);
  });

  it("builds a level-7 multiclass wizard in one pass", () => {
    const { events } = full();
    const b = buildFrom(events);
    expect(b.level).toBe(7);
    expect(b.classes[0]!.subclass).toBe("evocation");
    expect(b.spells).toHaveLength(3);
    expect(b.identity["name"]).toBe("Aelar Voss");
    expect(b.answered).toHaveLength(11);
  });
});
