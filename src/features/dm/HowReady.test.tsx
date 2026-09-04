import { describe, it, expect, afterEach } from "vitest";
import { mountPhone, DESK, type Phone } from "../../../tests/phone";
import { HowReady } from "./HowReady";
import { blankSession, type Prepared } from "./session";
import "../../design/tokens.css";

let phone: Phone | undefined;
afterEach(() => phone?.destroy());

const none = { encounters: 0, places: 0, people: 0 };
const some = { encounters: 2, places: 1, people: 3 };
const keep: Prepared = { ...blankSession("s1"), title: "The Shattered Keep" };
const text = (p: Phone) => p.doc.querySelector('[data-testid="readiness"]')?.textContent ?? "";

describe("the readiness meter", () => {
  it("draws nothing at all when no session has been started", async () => {
    /*
     * `SessionRail` directly above already says "Nothing planned yet" and
     * offers the button that fixes it. A second block underneath would be the
     * app saying nothing twice on the emptiest screen it has — and certainly
     * not "0%", which reads as failure where the rail's words read as an
     * invitation. `readiness.ts` still returns a null percentage here; this is
     * only the decision not to draw the box.
     */
    phone = await mountPhone(<HowReady session={null} have={none} />);
    expect(phone.doc.querySelector('[data-testid="readiness"]')).toBeNull();
  });

  it("gives the fraction beside the percentage, because it says what is left", async () => {
    phone = await mountPhone(<HowReady session={keep} have={some} />);
    expect(text(phone)).toContain("1 of 3 ready");
    expect(text(phone)).toContain("33%");
  });

  it("never names a thing this app cannot do", async () => {
    phone = await mountPhone(<HowReady session={keep} have={some} />);
    for (const absent of ["treasure", "loot", "quest", "random table"]) {
      expect(text(phone).toLowerCase()).not.toContain(absent);
    }
  });

  it("lets the DM tick their own lines and nobody tick a derived one", async () => {
    /*
     * Ticking "An opening to read out" without writing one would make the
     * meter lie on request, so derived lines are statements rather than
     * controls — they become true by doing the thing.
     */
    const ticked: string[] = [];
    phone = await mountPhone(
      <HowReady
        session={{ ...keep, checklist: [{ id: "a", label: "Name the innkeeper", done: false }] }}
        have={some}
        onToggle={(id) => ticked.push(id)}
      />,
    );
    const buttons = [...phone.doc.querySelectorAll("button")];
    expect(buttons).toHaveLength(1);
    expect(buttons[0]!.textContent).toContain("Name the innkeeper");
    buttons[0]!.click();
    expect(ticked).toEqual(["a"]);
  });

  it("keeps its targets at 44px and reads at both widths", async () => {
    for (const size of [undefined, DESK]) {
      const p = await mountPhone(
        <HowReady
          session={{ ...keep, checklist: [{ id: "a", label: "Name the innkeeper", done: false }] }}
          have={some} onToggle={() => {}}
        />, "light", size,
      );
      expect(p.smallTargets(), `at ${String(size?.width ?? 390)}`).toEqual([]);
      expect(p.mislabelled()).toEqual([]);
      p.destroy();
    }
  });
});
