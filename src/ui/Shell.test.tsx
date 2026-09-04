import { describe, it, expect, afterEach } from "vitest";
import { mountPhone, DESK, type Phone } from "../../tests/phone";
import { Shell } from "./Shell";
import "../design/tokens.css";

let phone: Phone | undefined;
afterEach(() => phone?.destroy());

/** The shell is the outermost element the harness renders. */
const width = (p: Phone) =>
  Math.round(p.doc.body.firstElementChild!.getBoundingClientRect().width);

describe("the player shell on a wide window", () => {
  it("stays a phone-shaped column rather than stretching", async () => {
    /*
     * Nothing a player looks at was designed to be a metre wide. Without the
     * cap, `Grid.module.css`'s `1fr 1fr` gave two 970px ancestry cards on a
     * desktop — one rule on the shell fixes every player screen at once
     * rather than a cap on each grid.
     */
    phone = await mountPhone(<Shell title="Ancestry"><p>choices</p></Shell>, "light", DESK);
    expect(width(phone)).toBeLessThanOrEqual(30 * 16);
  });

  it("fills a phone completely, because there the cap is never reached", async () => {
    phone = await mountPhone(<Shell title="Ancestry"><p>choices</p></Shell>);
    expect(width(phone)).toBe(390);
  });

  it("lets a DM screen out of it", async () => {
    /*
     * `Party` and `Staging` are DM screens still living on this shell — T25
     * moved Prep to `DmShell` and left them. Squeezing a party of six or a
     * bestiary into a 480px column is the opposite of what the DM side is for.
     */
    phone = await mountPhone(<Shell title="The party" wide><p>rows</p></Shell>, "light", DESK);
    expect(width(phone)).toBe(DESK.width);
  });
});
