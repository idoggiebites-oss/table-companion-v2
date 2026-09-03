import { Icon } from "./Icon";
import { currentOf, type Tab } from "./tabs";
import s from "./TabBar.module.css";

/* The rules are in `tabs.ts`, where they can be tested without a DOM. */
export function TabBar({ tabs, current = "characters", onGo }: {
  tabs: readonly Tab[];
  current?: string;
  onGo?: (id: string) => void;
}) {
  const here = currentOf(current, tabs);
  return (
    <nav className={s.bar} aria-label="Sections" data-testid="tabbar">
      {tabs.map((t) => (
        <button key={t.id} type="button" className={`${s.tab} ${t.id === here ? s.on : ""}`}
                aria-current={t.id === here ? "page" : undefined}
                onClick={() => onGo?.(t.id)}>
          <span className={s.glyph}>
            <Icon name={t.icon} size={22} />
            {t.dot === true && <span className={s.dot} data-testid="tab-dot" aria-hidden="true" />}
          </span>
          {t.label}
          {t.dot === true && <span className={s.sr}>, something is waiting</span>}
        </button>
      ))}
    </nav>
  );
}
