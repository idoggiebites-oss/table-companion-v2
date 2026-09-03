import { describe, it, expect } from "vitest";
import { membersIn } from "./members";
import { CHOICE } from "../creation/model";
import { VITAL } from "../sheet/model";
import type { Event } from "../../core/types";

let n = 0;
const ev = (kind: string, data: Record<string, unknown>): Event =>
  ({ id: `e${String(++n)}`, kind, seq: n, by: "d1", at: n, data } as unknown as Event);

const made = (id: string, name: string): Event[] => [
  ev(CHOICE, { character: id, step: "ancestry", race: "elf" }),
  ev(CHOICE, { character: id, step: "class", klass: "wizard" }),
  ev(CHOICE, { character: id, step: "identity", identity: { name } }),
];

describe("the party, as the DM reads it", () => {
  it("holds everyone the table has made", () => {
    const party = membersIn([...made("a", "Merlin"), ...made("b", "Brom")]);
    expect(party.map((m) => m.name)).toEqual(["Merlin", "Brom"]);
  });

  it("keeps its order when somebody is made mid-session", () => {
    /* `charactersIn` is newest-first, which is right for a hub asking "the one
       you are in the middle of" and wrong for a party: a row that jumps to the
       top mid-fight is a row the DM has to find again. */
    const one = membersIn(made("a", "Merlin"));
    const two = membersIn([...made("a", "Merlin"), ...made("b", "Brom")]);
    expect(two[0]?.name).toBe(one[0]?.name);
  });

  it("reads hit points from the same log the player's sheet reads", () => {
    const events = [...made("a", "Merlin"), ev(VITAL, { character: "a", act: "damage", n: 4 })];
    const [merlin] = membersIn(events);
    expect(merlin?.hp).toBe((merlin?.max ?? 0) - 4);
  });

  it("says how hurt they look, so six rows do not need six fractions", () => {
    const events = [...made("a", "Merlin"), ev(VITAL, { character: "a", act: "damage", n: 99 })];
    expect(membersIn(events)[0]?.step).toBe("near");
  });

  it("carries what is owed, so the DM sees it without opening a sheet", () => {
    /* Exactly the maximum: at zero you are DYING. One more point of it than
       your maximum and you are dead, which is a different row entirely — the
       first draft of this test asked for 999 and got a corpse. */
    const max = membersIn(made("a", "Merlin"))[0]?.max ?? 0;
    const events = [...made("a", "Merlin"), ev(VITAL, { character: "a", act: "damage", n: max })];
    const [merlin] = membersIn(events);
    expect(merlin?.dying).toBe(true);
    expect(merlin?.dead).toBe(false);
    expect(merlin?.waiting.join(" ")).toContain("Death saves");
  });

  it("tells dying apart from dead, which no single word could", () => {
    const max = membersIn(made("a", "Merlin"))[0]?.max ?? 0;
    const events = [...made("a", "Merlin"), ev(VITAL, { character: "a", act: "damage", n: max * 2 })];
    const [merlin] = membersIn(events);
    expect(merlin?.dead).toBe(true);
    expect(merlin?.dying).toBe(false);
  });

  it("is empty before anybody exists, rather than inventing a row", () => {
    expect(membersIn([])).toEqual([]);
  });
});
