import { Icon, type IconName } from "../../ui/Icon";
import s from "./Outline.module.css";

/**
 * The session outline: what is in tonight, and the way to each of it.
 *
 * **It navigates.** That is the structural half of the mockup and the part a
 * prose description of it lost — the rail is not a table of contents beside a
 * long scroll, it is the navigation, and the middle column shows the one
 * section you are on. Building it as a read-only list of counts made Prep a
 * stack of everything at once, which is the thing a workspace is supposed to
 * stop.
 *
 * **Icons, because a list of words is slower to scan than a list of shapes.**
 * The same argument `Icon.tsx` makes about the class marks: thirteen different
 * shapes rather than thirteen tinted copies of one.
 *
 * **Only what is built.** The mockup's outline also lists Quests, Loot &
 * Rewards, Notes, Random Tables and References. None exist, and `tabs.ts` holds
 * the rule this follows — a row reading "Quests 2" that goes nowhere is a
 * promise the app cannot keep. They join the day they are real.
 */
export type Section = "overview" | "encounters" | "places" | "people";

export const SECTIONS: readonly {
  readonly id: Section; readonly label: string; readonly icon: IconName;
}[] = [
  { id: "overview", label: "Overview", icon: "clipboard" },
  { id: "encounters", label: "Encounters", icon: "sword" },
  { id: "places", label: "Places", icon: "pin" },
  { id: "people", label: "People", icon: "person" },
];

export function Outline({ current, counts, onGo }: {
  current: Section;
  /** Absent for a section that is not a list of things — the overview. */
  counts: Readonly<Partial<Record<Section, number>>>;
  onGo: (to: Section) => void;
}) {
  return (
    <nav className={s.wrap} aria-label="Session outline">
      <span className={s.head}>Session outline</span>
      <ul className={s.list}>
        {SECTIONS.map((sec) => {
          const on = sec.id === current;
          const count = counts[sec.id];
          return (
            <li key={sec.id}>
              <button
                type="button" className={on ? `${s.row} ${s.on}` : s.row}
                aria-current={on ? "page" : undefined}
                onClick={() => onGo(sec.id)}
              >
                <span className={s.mark} aria-hidden="true"><Icon name={sec.icon} size={16} /></span>
                <span className={s.label}>{sec.label}</span>
                {count !== undefined && <span className={s.count}>{count}</span>}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
