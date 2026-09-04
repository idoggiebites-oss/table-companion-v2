import { Icon, type IconName } from "../../ui/Icon";
import type { Section } from "./Outline";
import s from "./QuickCreate.module.css";

/**
 * Six tiles in the mockup; three here, and the brief says why they exist at
 * all: *"A DM shouldn't have to dig through menus just to create an NPC they
 * invented thirty seconds before the session."*
 *
 * Three rather than six for the same reason the outline is short — Quest and
 * Loot have nothing behind them, and a tile that opens nothing is worse than a
 * missing tile, because it is a promise made and then broken at the one moment
 * the DM is in a hurry. Scene and Location are one thing today (`scene.ts` is
 * a place), so they are one tile until Task 37 splits them.
 *
 * Each tile GOES to the section and opens its editor, rather than opening a
 * modal of its own: what a DM does after making an NPC is usually look at the
 * others, and a modal would put them one dismissal away from that.
 */
const TILES: readonly {
  readonly to: Section; readonly label: string; readonly icon: IconName;
}[] = [
  { to: "encounters", label: "Encounter", icon: "sword" },
  { to: "places", label: "Place", icon: "pin" },
  { to: "people", label: "Person", icon: "person" },
];

export function QuickCreate({ onCreate }: { onCreate: (to: Section) => void }) {
  return (
    <section className={s.wrap} aria-label="Quick create">
      <span className={s.head}>Quick create</span>
      <div className={s.grid}>
        {TILES.map((t) => (
          <button key={t.to} type="button" className={s.tile}
                  onClick={() => onCreate(t.to)}>
            <span className={s.mark} aria-hidden="true"><Icon name={t.icon} size={20} /></span>
            <span className={s.label}>{t.label}</span>
          </button>
        ))}
      </div>
    </section>
  );
}
