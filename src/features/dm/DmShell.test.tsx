import { describe, it, expect, afterEach } from "vitest";
import { mountPhone, DESK, type Phone } from "../../../tests/phone";
import { DmShell } from "./DmShell";
import "../../design/tokens.css";

let phone: Phone | undefined;
afterEach(() => phone?.destroy());

const shell = (opts: { rail?: boolean; library?: boolean } = {}) => (
  <DmShell
    title="Prep"
    {...(opts.rail === false ? {} : { rail: <p>outline</p> })}
    {...(opts.library === true ? { library: <p>library</p> } : {})}
    below={<nav>tabs</nav>}
  >
    <p>the work</p>
  </DmShell>
);

/** Left edges of the three slots, which is what "a column" actually means. */
const lefts = (p: Phone) =>
  ["This session", "Campaign library"].map((label) => {
    const el = p.doc.querySelector(`[aria-label="${label}"]`);
    return el === null ? null : Math.round(el.getBoundingClientRect().left);
  });

describe("the DM shell", () => {
  it("stacks on a phone", async () => {
    /* One column, and one scroller: on a phone the columns are sections, and
       scrolling past one is how you reach the next. */
    phone = await mountPhone(shell({ library: true }));
    const rail = phone.doc.querySelector('[aria-label="This session"]')!.getBoundingClientRect();
    const work = phone.doc.querySelector("main")!.getBoundingClientRect();
    expect(Math.round(rail.left)).toBe(Math.round(work.left));
    expect(rail.bottom).toBeLessThanOrEqual(work.top + 1);
  });

  it("puts three beside each other on a desk", async () => {
    phone = await mountPhone(shell({ library: true }), "light", DESK);
    const work = phone.doc.querySelector("main")!.getBoundingClientRect();
    const [railLeft, libLeft] = lefts(phone);
    expect(railLeft).toBeLessThan(Math.round(work.left));
    expect(libLeft).toBeGreaterThan(Math.round(work.right) - 1);
  });

  it("gives the work the room when there is no library", async () => {
    /* An empty third track is a column of nothing, which is worse than two. */
    const withLib = await mountPhone(shell({ library: true }), "light", DESK);
    const wide = withLib.doc.querySelector("main")!.getBoundingClientRect().width;
    withLib.destroy();
    phone = await mountPhone(shell(), "light", DESK);
    expect(phone.doc.querySelector('[aria-label="Campaign library"]')).toBeNull();
    expect(phone.doc.querySelector("main")!.getBoundingClientRect().width)
      .toBeGreaterThan(wide);
  });

  it("gives the work the room when there is no rail either", async () => {
    /* The bestiary has neither a rail nor a library — reference material, not
       a session's own furniture — so a lone `<main>` must not land in the
       15rem cell a rail would have taken. */
    phone = await mountPhone(shell({ rail: false }), "light", DESK);
    expect(phone.doc.querySelector('[aria-label="This session"]')).toBeNull();
    expect(phone.doc.querySelector("main")!.getBoundingClientRect().width)
      .toBeGreaterThan(15 * 16);
  });

  it("never scrolls sideways, at either width", async () => {
    for (const size of [undefined, DESK]) {
      const p = await mountPhone(shell({ library: true }), "light", size);
      const el = p.doc.documentElement;
      expect(el.scrollWidth, `at ${String(size?.width ?? 390)}`)
        .toBeLessThanOrEqual(el.clientWidth);
      p.destroy();
    }
  });

  it("stops the work widening past a readable measure", async () => {
    /*
     * Two failures at once if it does not, both invisible at 390: prose runs
     * to a 750px line, and a heading with an action opposite it throws that
     * button most of a screen from the words it belongs to.
     */
    phone = await mountPhone(
      <DmShell title="Prep" rail={<p>outline</p>} below={<nav>tabs</nav>}>
        <div className="head" style={{ display: "flex", justifyContent: "space-between" }}>
          <h2>Encounters</h2><button type="button">Keep what is staged</button>
        </div>
      </DmShell>,
      "light", DESK,
    );
    const work = phone.doc.querySelector("main")!.getBoundingClientRect();
    expect(work.width).toBeLessThanOrEqual(34 * 16);
    const head = phone.doc.querySelector("h2")!.getBoundingClientRect();
    const action = phone.doc.querySelector("button")!.getBoundingClientRect();
    expect(action.left - head.right).toBeLessThan(420);
  });

  it("keeps the tab bar out of the scroller, so it cannot scroll away", async () => {
    phone = await mountPhone(shell({ library: true }));
    const scroll = phone.doc.querySelector('[data-testid="scroll"]')!;
    expect(scroll.contains(phone.doc.querySelector("nav"))).toBe(false);
  });
});
