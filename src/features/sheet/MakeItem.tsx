import { useState } from "react";
import { Drawer } from "../../ui/Drawer";
import { itemFacts, type Item, type WeaponProperty } from "../../rules/5e/items";
import { formatPrice, parseCoins } from "../../rules/5e/money";
import {
  HOMEBREW_PROPERTIES, toDraft, toItem, type HomebrewDraft, type HomebrewKind,
} from "./homebrew";
import s from "./MakeItem.module.css";

/**
 * Writing down a thing that is not in any book.
 *
 * A drawer rather than a screen, for the reason `Drawer.tsx` exists: the sheet
 * has a height budget, and reference material stacked below the live values is
 * how V1's sheet reached 3.9 screens.
 *
 * The form asks for what the SHAPE needs and nothing more. Somebody writing a
 * sword at eleven at night will not fill in a weight they are never going to
 * read, so the optional fields are genuinely optional and the required ones
 * are the ones a rule reads.
 *
 * **The preview is the honest part.** It renders `itemFacts(toItem(draft))` —
 * the same lines the pack will show, off the same record the rules will read.
 * So what is on screen while you type is not a mock-up of the result; it is
 * the result. If the app is going to read your sword as a simple melee weapon
 * dealing 1d4, you find that out here rather than in a fight.
 */
const KINDS: readonly { readonly id: HomebrewKind; readonly label: string }[] = [
  { id: "weapon", label: "Weapon" },
  { id: "armour", label: "Armour" },
  { id: "shield", label: "Shield" },
  { id: "gear", label: "Gear" },
];

const WEIGHTS = ["Light", "Medium", "Heavy"] as const;

const blank = (): HomebrewDraft => ({ name: "", kind: "weapon", cost: 0 });

export function MakeItem({ made, onSave, onForget, onClose }: {
  /** What this table has written down already, so one can be edited. */
  made: readonly Item[];
  onSave: (item: Item) => void;
  onForget: (id: string) => void;
  onClose: () => void;
}) {
  const [d, setD] = useState<HomebrewDraft>(blank);
  const [price, setPrice] = useState("");

  const set = <K extends keyof HomebrewDraft>(k: K, v: HomebrewDraft[K]) =>
    setD((prev) => ({ ...prev, [k]: v }));

  /* A price is typed as "15 gp" and stored as copper. An unparseable one is
     left at whatever it was rather than silently becoming zero. */
  const asked = parseCoins(price);
  const draft: HomebrewDraft = { ...d, cost: asked ?? d.cost };
  const preview = toItem(draft);
  const ready = d.name.trim() !== "";

  const props = d.properties ?? [];
  const toggle = (p: WeaponProperty) =>
    set("properties", props.includes(p) ? props.filter((x) => x !== p) : [...props, p]);

  const edit = (item: Item) => {
    const back = toDraft(item);
    setD(back);
    setPrice(back.cost > 0 ? formatPrice(back.cost) : "");
  };

  return (
    <Drawer title="Make something" onClose={onClose}>
      <div className={s.wrap}>
        {made.length > 0 && (
          <div className={s.made} data-testid="made">
            <span className={s.tag}>Already written down</span>
            {made.map((i) => (
              <span key={i.id} className={s.madeRow}>
                <button type="button" className={s.madeName}
                        aria-label={`Edit ${i.name}`} onClick={() => edit(i)}>
                  {i.name}
                </button>
                <button type="button" className={s.forget}
                        aria-label={`Forget ${i.name}`} onClick={() => onForget(i.id)}>×</button>
              </span>
            ))}
          </div>
        )}

        <div className={s.seg} role="group" aria-label="What sort of thing">
          {KINDS.map((k) => (
            <button key={k.id} type="button"
                    className={d.kind === k.id ? `${s.pick} ${s.on}` : s.pick}
                    aria-pressed={d.kind === k.id}
                    onClick={() => set("kind", k.id)}>
              {k.label}
            </button>
          ))}
        </div>

        <label className={s.field}>
          <span className={s.tag}>What it is called</span>
          <input className={s.text} value={d.name} placeholder="Sunderer"
                 onChange={(e) => set("name", e.target.value)} />
        </label>

        <div className={s.pair}>
          <label className={s.field}>
            <span className={s.tag}>What it costs</span>
            <input className={s.text} value={price} placeholder="15 gp"
                   onChange={(e) => setPrice(e.target.value)} />
          </label>
          <label className={s.field}>
            <span className={s.tag}>What it weighs</span>
            <input className={s.text} type="number" min={0} value={d.weight ?? ""}
                   placeholder="lb"
                   onChange={(e) => set("weight", e.target.value === "" ? undefined : Number(e.target.value))} />
          </label>
        </div>

        {d.kind === "weapon" && (
          <div className={s.block} data-testid="weapon-fields">
            <div className={s.pair}>
              <label className={s.field}>
                <span className={s.tag}>Damage</span>
                <input className={s.text} value={d.damage ?? ""} placeholder="1d8"
                       onChange={(e) => set("damage", e.target.value)} />
              </label>
              <label className={s.field}>
                <span className={s.tag}>Of what kind</span>
                <input className={s.text} value={d.damageType ?? ""} placeholder="slashing"
                       onChange={(e) => set("damageType", e.target.value)} />
              </label>
            </div>

            <div className={s.flags}>
              <button type="button" aria-pressed={d.martial === true}
                      className={d.martial === true ? `${s.chip} ${s.on}` : s.chip}
                      onClick={() => set("martial", d.martial !== true)}>Martial</button>
              <button type="button" aria-pressed={d.ranged === true}
                      className={d.ranged === true ? `${s.chip} ${s.on}` : s.chip}
                      onClick={() => set("ranged", d.ranged !== true)}>Ranged</button>
            </div>

            {/* Five, not fourteen. Each of these changes a number somewhere;
                the rest are flavour, and a form of fourteen checkboxes is one
                nobody finishes. */}
            <span className={s.tag}>How it handles</span>
            <div className={s.flags}>
              {HOMEBREW_PROPERTIES.map((p) => (
                <button key={p} type="button" aria-pressed={props.includes(p)}
                        className={props.includes(p) ? `${s.chip} ${s.on}` : s.chip}
                        onClick={() => toggle(p)}>{p}</button>
              ))}
            </div>

            {props.includes("versatile") && (
              <label className={s.field}>
                <span className={s.tag}>In two hands</span>
                <input className={s.text} value={d.twoHanded ?? ""} placeholder="1d10"
                       onChange={(e) => set("twoHanded", e.target.value)} />
              </label>
            )}

            {(d.ranged === true || props.includes("thrown")) && (
              <div className={s.pair}>
                <label className={s.field}>
                  <span className={s.tag}>Range</span>
                  <input className={s.text} type="number" min={0} value={d.rangeNormal ?? ""} placeholder="20"
                         onChange={(e) => set("rangeNormal", e.target.value === "" ? undefined : Number(e.target.value))} />
                </label>
                <label className={s.field}>
                  <span className={s.tag}>And at long</span>
                  <input className={s.text} type="number" min={0} value={d.rangeLong ?? ""} placeholder="60"
                         onChange={(e) => set("rangeLong", e.target.value === "" ? undefined : Number(e.target.value))} />
                </label>
              </div>
            )}
          </div>
        )}

        {d.kind === "armour" && (
          <div className={s.block} data-testid="armour-fields">
            <span className={s.tag}>How heavy</span>
            <div className={s.seg}>
              {WEIGHTS.map((w) => (
                <button key={w} type="button"
                        className={(d.armourWeight ?? "Light") === w ? `${s.pick} ${s.on}` : s.pick}
                        aria-pressed={(d.armourWeight ?? "Light") === w}
                        onClick={() => set("armourWeight", w)}>{w}</button>
              ))}
            </div>
            <div className={s.pair}>
              <label className={s.field}>
                <span className={s.tag}>Armour class</span>
                <input className={s.text} type="number" value={d.baseAc ?? ""} placeholder="11"
                       onChange={(e) => set("baseAc", e.target.value === "" ? undefined : Number(e.target.value))} />
              </label>
              <label className={s.field}>
                <span className={s.tag}>Strength needed</span>
                <input className={s.text} type="number" min={0} value={d.strMinimum ?? ""} placeholder="none"
                       onChange={(e) => set("strMinimum", e.target.value === "" ? undefined : Number(e.target.value))} />
              </label>
            </div>
            <div className={s.flags}>
              <button type="button" aria-pressed={d.stealthDisadvantage === true}
                      className={d.stealthDisadvantage === true ? `${s.chip} ${s.on}` : s.chip}
                      onClick={() => set("stealthDisadvantage", d.stealthDisadvantage !== true)}>
                Disadvantage on Stealth
              </button>
            </div>
          </div>
        )}

        {d.kind === "shield" && (
          <label className={s.field} data-testid="shield-fields">
            {/* What it ADDS, which is why the placeholder is 2 and not 12. */}
            <span className={s.tag}>What it adds to armour class</span>
            <input className={s.text} type="number" value={d.baseAc ?? ""} placeholder="2"
                   onChange={(e) => set("baseAc", e.target.value === "" ? undefined : Number(e.target.value))} />
          </label>
        )}

        <div className={s.pair}>
          <label className={s.field}>
            <span className={s.tag}>Rarity, or a word about it</span>
            <input className={s.text} value={d.detail ?? ""} placeholder="rare"
                   onChange={(e) => set("detail", e.target.value)} />
          </label>
          <div className={s.flags}>
            <button type="button" aria-pressed={d.magic === true}
                    className={d.magic === true ? `${s.chip} ${s.on}` : s.chip}
                    onClick={() => set("magic", d.magic !== true)}>Magical</button>
          </div>
        </div>

        {/*
          * Not a mock-up of the result — the result. These are the same lines
          * the pack prints, off the same record the rules will read.
          */}
        <div className={s.preview} data-testid="preview">
          <span className={s.previewName}>{preview.name}</span>
          <span className={s.previewFacts}>{itemFacts(preview).join(" · ")}</span>
        </div>

        <div className={s.row}>
          <button type="button" className={s.save} disabled={!ready}
                  onClick={() => { onSave(toItem(draft)); setD(blank()); setPrice(""); }}>
            Write it down
          </button>
          <button type="button" className={s.cancel} onClick={onClose}>Never mind</button>
        </div>
      </div>
    </Drawer>
  );
}
