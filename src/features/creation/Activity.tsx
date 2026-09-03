import { CHOICE } from "./model";
import { TAKE } from "../progression/model";
import { VITAL } from "../sheet/model";
import type { Event } from "../../core/types";
import s from "./Activity.module.css";

/**
 * What has happened lately, read out of the log rather than stored twice.
 *
 * The log already knows; a separate activity feed would be a second copy of
 * the truth that can disagree with the first.
 */
const SAID: Readonly<Record<string, string>> = {
  ancestry: "Chose an ancestry", subrace: "Chose a lineage", class: "Chose a class",
  level: "Set a level", multiclass: "Placed levels", subclass: "Chose a path",
  abilities: "Assigned ability scores", background: "Chose a background",
  skills: "Chose skills", style: "Adopted a fighting style",
  proficiencies: "Chose languages and tools",
  equipment: "Took starting gear", spells: "Learned spells",
  identity: "Named the character",
};

const describe = (e: Event): string => {
  if (e.kind === CHOICE) return SAID[String(e.data["step"])] ?? "Made a choice";
  if (e.kind === TAKE) return `Took a level of ${String(e.data["klass"])}`;
  if (e.kind === VITAL) return `Recorded ${String(e.data["act"])}`;
  if (e.kind === "skip") return "Took something back";
  return "Something happened";
};

const when = (at: number): string => {
  const mins = Math.round((Date.now() - at) / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
};

export function Activity({ events, onAll }: { events: readonly Event[]; onAll?: () => void }) {
  const recent = [...events].slice(-3).reverse();
  if (recent.length === 0) return null;
  return (
    <div className={s.card} data-testid="activity">
      <div className={s.cardHead}>
        <span className={s.label}>Recent activity</span>
        {onAll !== undefined && <button type="button" className={s.more} onClick={onAll}>View all</button>}
      </div>
      <div className={s.line}>
        {recent.map((e) => (
          <div key={e.id} className={s.entry}>
            <span className={s.what}>{describe(e)}</span>
            <span className={s.when}>{when(e.at)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
