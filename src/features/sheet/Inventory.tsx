import { useState } from "react";
import { Icon, type IconName } from "../../ui/Icon";
import { acFor } from "../../rules/5e/defence";
import { displacedBy } from "../../rules/5e/slots";
import { Figure, detailOf } from "./Figure";
import { carryLimit, isArmour, isShield, isWeapon, weightOf, type Item, type Stack } from "../../rules/5e/items";
import type { Worn } from "../../rules/5e/armour";
import { scoresOf, type Build, type Choice } from "../creation/model";
import { stacksOf, equippedOf } from "./carried";
import { Pack } from "./Pack";
import s from "./Inventory.module.css";

const TABS = [
  { id: "weapons", label: "Weapons" },
  { id: "armor", label: "Armor" },
  { id: "gear", label: "Gear" },
  { id: "consumables", label: "Consumables" },
] as const;

/**
 * What a character is carrying, and what of it is in hand.
 *
 * The concept draws this as its own screen with the character's identity and
 * ability scores on top. Here it is a TAB under a sheet that already carries
 * both, so the header is not repeated — what the screen keeps is its own
 * three bands: what you are carrying in total, the figure, and the pack.
 *
 * The `TO HIT` column the concept shows is deliberately absent. There is no
 * attack derivation yet, and a fabricated `+7` beside a real `1d8` is the one
 * thing worse than a missing column.
 */
export function Inventory({ build, catalogue, loading, onAct }: {
  build: Build;
  catalogue: readonly Item[];
  loading?: boolean;
  onAct?: (c: Choice) => void;
}) {
  const [tab, setTab] = useState<string>("weapons");
  const of = (id: string) => catalogue.find((i) => i.id === id);
  const stacks = stacksOf(build, catalogue);
  /* Seeded from what creation decided when nobody has said otherwise —
     otherwise the first thing put on rebuilds `worn` from a set that never
     held the armour, and the character loses it. */
  const equippedIds = equippedOf(build, catalogue);
  const equipped = equippedIds.map(of).filter((i): i is Item => i !== undefined);
  const scores = scoresOf(build);
  const carried = weightOf(stacks, of);
  const limit = carryLimit(scores.str);
  const ac = acFor(build.worn, scores);

  /* Putting something on may take something off — a greatsword needs both
     hands. The screen works that out, because it holds the catalogue; the
     event records the result, so the log shows the shield going. */
  const wear = (item: Item, on: boolean) => {
    const next = on
      ? [...equippedIds.filter((id) => !displacedBy(item, equipped).some((d) => d.id === id)), item.id]
      : equippedIds.filter((id) => id !== item.id);
    const worn: Worn[] = next
      .map(of)
      .filter((i): i is Item => i !== undefined && (isArmour(i) || isShield(i)))
      .map((i) => ({
        name: i.name,
        kind: isShield(i) ? "shield" as const
          : (i.armorCategory ?? "Light").toLowerCase() as "light" | "medium" | "heavy",
        ac: i.baseAc ?? 10,
        ...(i.maxDex === undefined ? {} : { maxDex: i.maxDex }),
        ...(i.strMinimum === undefined ? {} : { strMinimum: i.strMinimum }),
        ...(i.stealthDisadvantage === true ? { stealthDisadvantage: true } : {}),
      }));
    onAct?.({ step: "wear", equipped: next, worn, said: item.name });
  };

  if (loading === true && catalogue.length === 0) {
    return <p className={s.note} data-testid="inventory">Fetching the catalogue…</p>;
  }

  return (
    <div data-testid="inventory">
      {/* What you are carrying, against what you can. Not a limit the app
          enforces — it is a number the table reads. */}
      <div className={s.carry}>
        <span className={s.carryHead}>
          <span className={s.label}>Carry weight</span>
          <span className={s.label}>Armor class</span>
        </span>
        <span className={s.carryBody}>
          <span className={s.weight}>
            {carried.toFixed(1)}<span className={s.of}> / {limit} lb</span>
          </span>
          <span className={s.shield}>{ac.value}</span>
        </span>
        <span className={s.track}>
          <span className={s.fill} style={{ width: `${String(Math.min(100, Math.round((carried / limit) * 100)))}%` }} />
        </span>
        <span className={s.from}>{ac.from}</span>
        {/* What the armour costs. Shown beside the number it bought, because
            a sheet that says 18 and not "disadvantage on Stealth" has told
            half the story. */}
        {(ac.stealthDisadvantage || ac.speedPenalty > 0) && (
          <span className={s.cost}>
            {[
              ac.stealthDisadvantage ? "Disadvantage on Stealth" : null,
              ac.speedPenalty > 0
                ? `Speed ${String(build.speed - ac.speedPenalty)} ft. — you are not strong enough for this armour`
                : null,
            ].filter(Boolean).join(" · ")}
          </span>
        )}
      </div>

      <Figure equipped={equipped} onTake={(i) => wear(i, false)} />

      <Pack stacks={stacks} catalogue={catalogue} equipped={equippedIds} onWear={wear} />
    </div>
  );
}
