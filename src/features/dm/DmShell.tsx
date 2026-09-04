import type { ReactNode } from "react";
import s from "./DmShell.module.css";

/**
 * The DM's shell: an outline, the work, and the library beside it.
 *
 * DESIGN.md has said this since before there was anything to put in it — *"The
 * DM side starts at tablet and desktop and collapses to a phone, which is the
 * opposite direction… A player looks at one character and a DM looks at a
 * fight, a party, and their prep at once… So the two surfaces do not share a
 * shell."* This is that second shell. `ui/Shell.tsx` is untouched and stays
 * phone-first; the two share tokens, components, the log and the room, and
 * nothing else.
 *
 * Three columns at 64rem, two at 46rem, one below — the proportions taken from
 * the mockup, which runs about 21 / 52 / 27.
 *
 * **Each column scrolls on its own once there is room for them side by side**,
 * and that is the whole point of the layout rather than a detail of it:
 * DESIGN.md's reason for the DM starting wide is that *"a column that has to
 * be scrolled to is a column that is not read while five people wait"*. One
 * page-length scroller would put the outline off the top of the screen the
 * moment the middle column got long, which is exactly the failure the wide
 * layout exists to avoid. Stacked on a phone they become one scroller again,
 * because there the columns are sections and scrolling past one is how you
 * reach the next.
 */
export function DmShell({ title, trail, rail, library, below, children }: {
  title: string;
  /** Sits at the right of the header. */
  trail?: ReactNode;
  /** The left column: what this session is, and what is in it. */
  rail?: ReactNode;
  /** The right column: reusable campaign material, not tonight's plan. */
  library?: ReactNode;
  /** Pinned below — the tab bar. */
  below?: ReactNode;
  children: ReactNode;
}) {
  /*
   * Every caller so far (`Prep`) has a rail, so this collapse was never
   * needed until the bestiary — reference material with nothing session-
   * specific to put beside it. Without `.noRail` a lone `<main>` lands in
   * CSS Grid's first cell, which at 46rem is the 15rem track meant for the
   * rail: the work column would be squeezed to card-index width. Mirrors the
   * `.noLibrary` collapse already here for the same reason on the other side.
   */
  const cols = [s.columns, rail === undefined ? s.noRail : "", library === undefined ? s.noLibrary : ""]
    .filter(Boolean).join(" ");
  return (
    <div className={s.shell}>
      {/* The same slot pattern as the player header, for the same reason: a
          title centres on the header rather than on what is left over. */}
      <header className={s.head}>
        <span className={s.slot} />
        <h1 className={s.title}>{title}</h1>
        <span className={`${s.slot} ${s.slotEnd}`}>{trail}</span>
      </header>

      {/*
        * `data-testid="scroll"` so `mountPhone().screens()` measures this the
        * way it measures the player shell — one harness, both surfaces.
        */}
      <div className={cols} data-testid="scroll">
        {rail !== undefined && (
          <aside className={s.rail} aria-label="This session">{rail}</aside>
        )}
        <main className={s.work}>{children}</main>
        {library !== undefined && (
          <aside className={s.library} aria-label="Campaign library">{library}</aside>
        )}
      </div>

      {/* Always rendered, empty or not — the grid declares its rows, and a
          missing child hands the columns an `auto` row instead of 1fr. That
          has bitten the player shell once already. */}
      <div className={s.band}>{below}</div>
    </div>
  );
}
