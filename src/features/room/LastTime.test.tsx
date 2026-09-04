import { describe, it, expect, afterEach } from "vitest";
import { mountPhone, type Phone } from "../../../tests/phone";
import { LastTime } from "./LastTime";
import { FIGHT } from "../dm/fight";
import { VITAL } from "../sheet/model";
import { asDevice, type Event } from "../../core/types";
import "../../design/tokens.css";

let phone: Phone | undefined;
afterEach(() => phone?.destroy());

let n = 0;
const at = (ms: number, kind: string, data: Record<string, unknown>): Event =>
  ({ id: `e${String(++n)}`, kind, seq: n, by: asDevice("d1"), at: ms, data } as Event);
const nameOf = (id: string) => (id === "b1" ? "Kira" : id);
const mount = (events: readonly Event[]) =>
  mountPhone(<LastTime events={events} nameOf={nameOf} />);

const NIGHT = [
  at(Date.now(), FIGHT, { act: "room", room: { light: "dark", terrain: [] } }),
  at(Date.now() + 1, FIGHT, { act: "begin" }),
  at(Date.now() + 2, VITAL, { act: "damage", n: 11, character: "b1" }),
];

describe("what happened last time", () => {
  it("reads as prose, in the order a table tells it", async () => {
    phone = await mount(NIGHT);
    const text = phone.doc.querySelector('[data-testid="recap"]')?.textContent ?? "";
    expect(text).toContain("You fought in dark.");
    expect(text).toContain("One fight.");
    expect(text).toContain("The hardest hit of the night landed on Kira, for 11.");
  });

  it("shows nothing at all when there is nothing to say", async () => {
    /* A recap that manufactured a sentence out of "the app was opened" would
       teach the table to stop believing the ones that matter. */
    phone = await mount([at(Date.now(), VITAL, { act: "temp", n: 0, character: "b1" })]);
    expect(phone.doc.querySelector('[data-testid="recap"]')).toBeNull();
  });

  it("and nothing at all on an empty log", async () => {
    phone = await mount([]);
    expect(phone.doc.querySelector('[data-testid="recap"]')).toBeNull();
  });

  it("dates itself the way a table refers to a session", async () => {
    phone = await mount(NIGHT);
    expect(phone.doc.querySelector('[data-testid="recap"]')?.textContent).toContain("today");
  });
});
