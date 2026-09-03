import { Icon, type IconName } from "../../ui/Icon";
import { SLOTS, figureOf, rarityStep, type SlotId } from "../../rules/5e/slots";
import { isShield, type Item } from "../../rules/5e/items";
import s from "./Figure.module.css";

const SLOT_ICON: Readonly<Record<SlotId, IconName>> = {
  main: "sword", off: "shield", armor: "shield",
  cloak: "person", boots: "person", trinket: "spark",
};

/**
 * What you are wearing, as a figure rather than a list.
 *
 * V1's reason, and it is the right one: a list of equipped items answers
 * "what do I own that is ticked". The question a player actually asks is
 * "what is in my hands" and "what am I wearing" — and the shape of that
 * answer is a person, which is why every game that has ever had equipment
 * draws one.
 *
 * The six places are a READING of what is equipped, not a rules system 5e
 * does not have. Anything that fits none of them is named underneath rather
 * than forced into a slot it does not belong in.
 */
export function Figure({ equipped, onTake }: {
  equipped: readonly Item[];
  onTake?: (item: Item) => void;
}) {
  const figure = figureOf(equipped);
  return (
    <>
      <div className={s.slots} data-testid="slots">
        {SLOTS.map((slot) => {
          const item = figure.slots[slot.id];
          return (
            <button key={slot.id} type="button" className={s.slot}
                    disabled={item === null}
                    onClick={() => item !== null && onTake?.(item)}>
              <span className={s.thumb} aria-hidden="true"><Icon name={SLOT_ICON[slot.id]} /></span>
              <span className={s.stack}>
                <span className={s.label}>{slot.name}</span>
                {item === null
                  ? <span className={s.emptySlot}>{slot.what}</span>
                  : <>
                      <span className={s.itemName}>{item.name}</span>
                      <span className={s.detail}>{detailOf(item)}</span>
                    </>}
              </span>
              {/* Rarity as a rim, never a fill — red already means damage here
                  and green means healing, so rarity gets no hue of its own. */}
              {item !== null && rarityStep(item) > 0 && <span className={s.rare} aria-hidden="true" />}
            </button>
          );
        })}
      </div>
      {figure.elsewhere.length > 0 && (
        <p className={s.elsewhere}>
          Also worn: {figure.elsewhere.map((i) => i.name).join(", ")}
        </p>
      )}
    </>
  );
}

/** The line under an item's name: what it does, in the book's own numbers. */
export function detailOf(i: Item): string {
  if (i.damage !== undefined) return `${i.damage} ${i.damageType?.toLowerCase() ?? "damage"}`;
  if (isShield(i)) return `+${String(i.baseAc ?? 2)} armour class`;
  if (i.baseAc !== undefined) return `AC ${String(i.baseAc)}${i.dexBonus === true ? " + Dex" : ""}`;
  return i.detail ?? i.category;
}
