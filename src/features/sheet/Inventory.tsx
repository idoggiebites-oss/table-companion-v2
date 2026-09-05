import { useState } from "react";
import { Icon, type IconName } from "../../ui/Icon";
import { acFor } from "../../rules/5e/defence";
import { displacedBy } from "../../rules/5e/slots";
import { Figure, detailOf } from "./Figure";
import { carryLimit, weightOf, type Item, type Stack } from "../../rules/5e/items";
import { wornFrom } from "../../rules/5e/armour";
import type { Build } from "../creation/model";
import { scoresOf } from "../creation/scores";
import type { Choice } from "../creation/choices";
import { stacksOf, equippedOf } from "./carried";
import { Pack } from "./Pack";
import { MakeItem } from "./MakeItem";
import { Give } from "./Give";
import { formatCoins } from "../../rules/5e/money";
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
export function Inventory({ build, catalogue, made = [], loading, onAct, onMake, onForgetMade,
  purse = 0, held, party = [], onGive }: {
  build: Build;
  catalogue: readonly Item[];
  /**
   * The things this table wrote down itself.
   *
   * Passed in already merged into `catalogue` above — these are here only so
   * the form can list them for editing. Nothing on this screen asks which of
   * the items it is showing came from where, and `check-homebrew` fails the
   * build if anything starts to.
   */
  made?: readonly Item[];
  loading?: boolean;
  onAct?: (c: Choice) => void;
  onMake?: (i: Item) => void;
  onForgetMade?: (id: string) => void;
  /** Copper. See `features/room/holdings.ts`. */
  purse?: number;
  /** What is actually carried once things have changed hands — creation's own
      answer when nothing has. */
  held?: (base: readonly Stack[]) => readonly Stack[];
  /** Everyone a thing can be handed to. */
  party?: readonly { readonly id: string; readonly name: string }[];
  onGive?: (to: string, stack: Stack, qty: number) => void;
}) {
  const [tab, setTab] = useState<string>("weapons");
  const [making, setMaking] = useState(false);
  const of = (id: string) => catalogue.find((i) => i.id === id);
  /* What creation gave them, plus everything that has changed hands since. */
  const base = stacksOf(build, catalogue);
  const stacks = held === undefined ? base : [...held(base)];
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
    const worn = wornFrom(next.map(of).filter((i): i is Item => i !== undefined));
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
          {/* Only where there is one: a table that has never handed out a coin
              is not counting them, and a "0 cp" nobody earned is a number
              somebody would try to read. */}
          {purse > 0 && <span className={s.label}>Purse</span>}
          <span className={s.label}>Armor class</span>
        </span>
        <span className={s.carryBody}>
          <span className={s.weight}>
            {carried.toFixed(1)}<span className={s.of}> / {limit} lb</span>
          </span>
          {purse > 0 && <span className={s.purse} data-testid="purse">{formatCoins(purse)}</span>}
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

      <Pack stacks={stacks} catalogue={catalogue} equipped={equippedIds} onWear={wear}
            party={party} {...(onGive === undefined ? {} : { onGive })} />

      {onMake !== undefined && (
        <button type="button" className={s.make} onClick={() => setMaking(true)}>
          Make something the books do not have
        </button>
      )}

      {making && onMake !== undefined && (
        <MakeItem
          made={made}
          onSave={(i) => {
            onMake(i);
            /*
               And you have one. This form's only door is your own pack, so
               writing a thing down here means you own it — a made-up sword
               that lands in the catalogue and nowhere else cannot be carried
               or equipped, which is half of what it exists for.

               `carry` replaces the picked-up pile wholesale, which is why the
               existing stacks are spread back in rather than appended to. */
            onAct?.({
              step: "carry", said: i.name,
              stacks: [...build.stacks, { itemId: i.id, name: i.name, qty: 1 }],
            });
            setMaking(false);
          }}
          onForget={(id) => onForgetMade?.(id)}
          onClose={() => setMaking(false)}
        />
      )}
    </div>
  );
}
