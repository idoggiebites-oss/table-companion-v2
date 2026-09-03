import { describe, it, expect } from "vitest";
import { DM, controls, seatable, seatIn, seatLabel, type Seat } from "./seat";

const player = (character: string): Seat => ({ kind: "player", character });
const party = ["merlin", "brom", "sera"];

describe("who a seat acts for", () => {
  it("acts for its own character and nobody else's", () => {
    expect(controls(player("merlin"), "merlin")).toBe(true);
    expect(controls(player("merlin"), "brom")).toBe(false);
  });

  it("does not act for a character merely by being the DM", () => {
    /* The DM drives a character by BECOMING them — V1 does the same, and it
       is why `controls` is about the seat rather than about authority. */
    expect(controls(DM, "merlin")).toBe(false);
  });
});

describe("what a device may sit in", () => {
  it("offers the DM the whole party", () => {
    expect(seatable(DM, [], party)).toEqual(party);
  });

  it("offers a player only what this device claimed", () => {
    /* Without this the control listed everyone, and a player could sit in
       somebody else's character and spend their resources. */
    expect(seatable(player("merlin"), ["merlin"], party)).toEqual(["merlin"]);
  });

  it("keeps the seat you are in even when it was never claimed", () => {
    /* A DM who took Brom has not claimed him; dropping him from the list
       would strand the control on a value it cannot show. */
    expect(seatable(player("brom"), ["merlin"], party)).toEqual(["merlin", "brom"]);
  });

  it("offers two when a device runs two characters", () => {
    expect(seatable(player("merlin"), ["merlin", "sera"], party)).toEqual(["merlin", "sera"]);
  });
});

describe("a seat pointing at somebody who is gone", () => {
  it("falls back rather than leaving a device with no sheet", () => {
    expect(seatIn(player("merlin"), party)).toEqual(player("merlin"));
    expect(seatIn(player("ghost"), party)).toEqual(DM);
  });

  it("leaves the DM alone, who depends on nobody existing", () => {
    expect(seatIn(DM, [])).toEqual(DM);
  });
});

describe("how the seat reads", () => {
  it("names the person, not the id", () => {
    const name = (id: string) => (id === "merlin" ? "Merlin Ashgrove" : id);
    expect(seatLabel(player("merlin"), name)).toBe("Merlin Ashgrove");
    expect(seatLabel(DM, name)).toBe("The DM");
  });
});
