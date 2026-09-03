import type { ReactNode } from "react";
import s from "./Shell.module.css";

type Props = {
  title: string;
  lead?: ReactNode;
  /** Sits under the header and stays pinned with it. */
  before?: ReactNode;
  /** Sits at the right of the header. */
  trail?: ReactNode;
  /** Pinned below the footer — the tab bar. */
  below?: ReactNode;
  children: ReactNode;
  counter?: ReactNode;
  actions?: ReactNode;
};

/**
 * The play/step shell: pinned header, one scrolling middle, pinned footer.
 * A document, not a page — heights are dvh so iOS chrome cannot lie about them.
 */
export function Shell({ title, lead, trail, before, children, counter, actions, below }: Props) {
  return (
    <div className={s.shell}>
      {/* Equal-width slots on BOTH sides, always rendered. `flex: 1` centres
          the title in what is left over, so a back chevron with no trailing
          button pushed every step's title half a tap target to the right. */}
      <header className={s.head}>
        <span className={s.slot}>{lead}</span>
        <h1 className={s.title}>{title}</h1>
        <span className={`${s.slot} ${s.slotEnd}`}>{trail}</span>
      </header>
      {/* Always rendered, even when empty: the grid declares four rows, and a
          missing child would hand the scroller an `auto` row instead of 1fr. */}
      <div className={s.band}>{before}</div>
      <div className={s.scroll} data-testid="scroll">
        {children}
      </div>
      {(counter || actions) && (
        <footer className={s.foot}>
          {counter && <div className={s.counter}>{counter}</div>}
          {actions}
        </footer>
      )}
      {/* Always rendered, empty or not — five declared rows need five children,
          or the scroller loses its 1fr. This has bitten once already. */}
      <div className={s.band}>{below}</div>
    </div>
  );
}
