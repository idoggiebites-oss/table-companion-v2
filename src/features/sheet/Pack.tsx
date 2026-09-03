import { useState } from "react";
import { Icon, type IconName } from "../../ui/Icon";
import { isArmour, isShield, isWeapon, type Item, type Stack } from "../../rules/5e/items";
import { inBucket } from "./carried";
import { detailOf } from "./Figure";
import s from "./Pack.module.css";

const TABS = [
  { id: "weapons", label: "Weapons" },
  { id: "armor", label: "Armor" },
  { id: "gear", label: "Gear" },
  { id: "consumables", label: "Consumables" },
] as const;

/**
 * The pack: everything carried, under the four headings the sheet sorts by.
 *
 * The concept's `TO HIT` column is deliberately absent. There is no attack
 * derivation until the fight, and a fabricated `+7` beside a real `1d8` is the
 * one thing worse than a missing column.
 */
export function Pack({ stacks, catalogue, equipped, onWear }: {
  stacks: readonly Stack[];
  catalogue: readonly Item[];
  equipped: readonly string[];
  onWear: (i: Item, on: boolean) => void;
}) {
  const [tab, setTab] = useState<string>("weapons");
  const of = (id: string) => catalogue.find((i) => i.id === id);
  const rows = inBucket(stacks, catalogue, tab);

  return (
    <div className={s.pack}>
      <div className={s.tabs} role="tablist" aria-label="Inventory">
        {TABS.map((t) => (
          <button key={t.id} type="button" role="tab" aria-selected={t.id === tab}
                  className={`${s.tab} ${t.id === tab ? s.on : ""}`}
                  onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>
      {rows.length === 0 ? <p className={s.note}>Nothing here.</p> : (
        <div className={s.rows}>
          {rows.map((st) => {
            const item = of(st.itemId);
            const on = equipped.includes(st.itemId);
            return (
              <span key={st.itemId} className={s.row}>
                <span className={s.thumb} aria-hidden="true"><Icon name={iconFor(item)} /></span>
                <span className={s.stack}>
                  <span className={s.rowName}>
                    {st.name}{st.qty > 1 && <span className={s.qty}> ×{st.qty}</span>}
                  </span>
                  <span className={s.detail}>
                    {item === undefined ? "Not in the catalogue" : detailOf(item)}
                  </span>
                </span>
                {item?.damage === undefined ? <span /> : (
                  <span className={s.pair}>
                    <span className={s.num}>{item.damage}</span>
                    <span className={s.micro}>DMG</span>
                  </span>
                )}
                {item === undefined || !canWear(item) ? <span /> : (
                  <button type="button" className={`${s.equip} ${on ? s.worn : ""}`}
                          onClick={() => onWear(item, !on)}>
                    {on ? "Equipped" : "Equip"}
                  </button>
                )}
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}

/** A glyph for the kind of thing it is. The app ships no item art. */
function iconFor(i: Item | undefined): IconName {
  if (i === undefined) return "note";
  if (isWeapon(i)) return i.weaponRange === "Ranged" ? "bow" : "sword";
  if (isShield(i) || isArmour(i)) return "shield";
  if (/\b(potion|elixir|oil|flask|vial)\b/i.test(i.name)) return "flask";
  if (/\b(scroll|book|tome)\b/i.test(i.name)) return "book";
  return "note";
}

/** Only things that go somewhere can be put on. A rope cannot be equipped. */
const canWear = (i: Item): boolean => isWeapon(i) || isArmour(i) || isShield(i)
  || /\b(cloak|cape|mantle|boots|shoes|ring|amulet|necklace|pendant|talisman|charm|brooch)\b/i.test(i.name);
