import type { ReactNode } from "react";
import { Icon, type IconName } from "../Icon";
import { useLongPress } from "./useLongPress";
import s from "./Choices.module.css";
import g from "./Grid.module.css";

/**
 * Icons are SVG, never a glyph: 17 of 39 candidate characters render as colour
 * emoji somewhere and four cannot be stopped. `currentColor` so an icon can
 * never arrive in a colour that means something else.
 */
export function Tick() {
  return (
    <svg className={s.tick} width="20" height="20" viewBox="0 0 20 20" aria-hidden="true">
      <circle cx="10" cy="10" r="9" fill="currentColor" />
      <path d="M6 10.5l2.5 2.5L14 7.5" fill="none" stroke="var(--on-gold)" strokeWidth="2"
            strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/**
 * The face of an ancestry, or a placeholder where the game has none.
 *
 * Decorative, and hidden from the accessibility tree: the name it illustrates
 * is the next element along, so announcing it twice makes the option's
 * accessible name "Elf portrait placeholder Elf".
 *
 * Lazy and async: the ancestry grid is 68 cards, and a person only ever sees
 * the first six before they scroll.
 */
export function Portrait({ name, art }: { name: string; art?: string }) {
  if (art !== undefined) {
    /* `draggable` as well as the CSS: the attribute is what desktop browsers
       read, and the CSS is what iOS reads. */
    return (
      <img className={g.portrait} src={art} alt="" aria-hidden="true"
           draggable={false} loading="lazy" decoding="async" />
    );
  }
  const initial = name.trim().charAt(0).toUpperCase();
  return (
    <svg className={g.portrait} viewBox="0 0 80 60" aria-hidden="true">
      <rect width="80" height="60" rx="6" fill="var(--surface-2)" />
      <text x="40" y="38" textAnchor="middle" fontSize="22" fill="var(--ink-dim)"
            fontFamily="var(--font-display)">{initial}</text>
    </svg>
  );
}

export type Option = {
  readonly id: string;
  readonly name: string;
  readonly role?: string;
  readonly tags?: readonly string[];
  readonly icon?: IconName;
  /** Art for this option, when the game has a face for it. */
  readonly art?: string;
  /** A heading this option sits under — the book that printed it. */
  readonly group?: string;
  /** Where that heading sorts. Unfiled groups go last. */
  readonly groupOrder?: number;
  /** What choosing this grants — an ancestry's ability bonuses and speed. */
  readonly bonuses?: Readonly<Record<string, number>>;
  readonly speed?: number;
  /** Shown when this option is not the game's own. */
  readonly mark?: string;
  /**
   * The record whose prose explains this option, when it is not this option.
   *
   * An ancestry row is a GROUP — "Elf" covers seven records — so it borrows
   * its first lineage's description, the same way it borrows its face and its
   * ability bonuses.
   */
  readonly describe?: string;
  /**
   * Where this came from, when it was granted rather than chosen. A row with
   * one is ticked and not pressable: a Sage already has History, and offering
   * it again spends a choice on something already held. V1's own note — a
   * background grants two skills and a race sometimes grants one, and asking
   * for class skills before either is how a player loses a pick.
   */
  readonly held?: string;
  /**
   * Why this cannot be taken. Shown and unpressable — a feat a character does
   * not qualify for is worth seeing, and hiding it makes the list a mystery.
   */
  readonly blocked?: string;
};

/**
 * One pool with its own count — a line of the equipment list, or one source's
 * languages. Several of these make up a single screen.
 */
export type Group = {
  readonly id: string;
  readonly label: string;
  /** Who is asking — "Sage", "Bard". Defaults to "choose N". */
  readonly note?: string;
  readonly limit: number;
  readonly options: readonly Option[];
};

/** Two-up illustrated cards. Ancestry. */
export function ChoiceGrid({ options, value, onChange, onAsk }: {
  options: readonly Option[]; value: string | null; onChange: (id: string) => void;
  onAsk?: (id: string) => void;
}) {
  return (
    <div className={g.grid} role="radiogroup" data-testid="choices">
      {options.map((o) => (
        <Card key={o.id} option={o} value={value} onChange={onChange}
              {...(onAsk === undefined ? {} : { onAsk })} />
      ))}
    </div>
  );
}

/** One illustrated card. Held down, it explains itself instead of being chosen. */
function Card({ option: o, value, onChange, onAsk }: {
  option: Option; value: string | null; onChange: (id: string) => void; onAsk?: (id: string) => void;
}) {
  const hold = useLongPress(() => onAsk?.(o.id));
  return (
    <button type="button" role="radio" aria-checked={o.id === value}
            className={`${g.card} ${o.id === value ? s.picked : ""}`}
            {...(onAsk === undefined ? {} : hold)}
            onClick={() => onChange(o.id)}>
          <span className={g.frame}>
            <Portrait name={o.name} {...(o.art === undefined ? {} : { art: o.art })} />
            {/* The name sits ON the art, over a scrim, as drawn. */}
            <span className={g.caption}>{o.name}</span>
          </span>
      {o.mark !== undefined && <span className={s.mark}>{o.mark}</span>}
      {o.id === value && <Tick />}
    </button>
  );
}

/**
 * Rows, optionally under headings.
 *
 * A wizard is offered eleven traditions and a paladin nine oaths, and which
 * book printed each is the thing a table actually sorts by. Anything the book
 * table does not know lands under "Elsewhere" and stays visible — the headings
 * order the list, they never hide from it.
 */
export function ChoiceList({ options, value, onChange, onAsk }: {
  options: readonly Option[]; value: string | null; onChange: (id: string) => void;
  /** Held down, a row explains itself rather than being chosen. */
  onAsk?: (id: string) => void;
}) {
  const ask = onAsk === undefined ? {} : { onAsk };
  const grouped = options.some((o) => o.group !== undefined);
  if (!grouped) return <Rows options={options} value={value} onChange={onChange} {...ask} />;

  const order = new Map<string, number>();
  for (const o of options) {
    const name = o.group ?? "Elsewhere";
    order.set(name, Math.min(order.get(name) ?? Number.MAX_SAFE_INTEGER, o.groupOrder ?? Number.MAX_SAFE_INTEGER));
  }
  const books = [...order.entries()].sort((a, x) => a[1] - x[1] || a[0].localeCompare(x[0]));

  return (
    <div className={s.list} role="radiogroup" data-testid="choices">
      {books.map(([book]) => (
        <div key={book} className={s.group}>
          <span className={s.groupName}>{book}</span>
          <Rows
            options={options.filter((o) => (o.group ?? "Elsewhere") === book)}
            value={value}
            onChange={onChange}
            {...ask}
            flat
          />
        </div>
      ))}
    </div>
  );
}

function Rows({ options, value, onChange, onAsk, flat = false }: {
  options: readonly Option[]; value: string | null; onChange: (id: string) => void;
  onAsk?: (id: string) => void; flat?: boolean;
}) {
  return (
    <div className={s.list} {...(flat ? {} : { role: "radiogroup", "data-testid": "choices" })}>
      {options.map((o) => (
        <Row key={o.id} option={o} value={value} onChange={onChange}
             {...(onAsk === undefined ? {} : { onAsk })} />
      ))}
    </div>
  );
}

/** One pressable row. Held down, it explains itself instead of being chosen. */
function Row({ option: o, value, onChange, onAsk }: {
  option: Option; value: string | null; onChange: (id: string) => void; onAsk?: (id: string) => void;
}) {
  const hold = useLongPress(() => onAsk?.(o.id));
  return (
    <button type="button" role="radio" aria-checked={o.id === value}
                className={`${s.row} ${o.id === value ? s.picked : ""}`}
                {...(onAsk === undefined ? {} : hold)}
                onClick={() => onChange(o.id)}>
          {/* No icon, no well. A generic book on every path row says nothing
              the heading above it has not already said. */}
          {o.icon === undefined ? <span /> : (
            <span className={s.badge} aria-hidden="true"><Icon name={o.icon} /></span>
          )}
          <span className={s.stack}>
            <span className={s.name}>{o.name}</span>
            {o.role !== undefined && <span className={s.role}>{o.role}</span>}
            {o.tags !== undefined && o.tags.length > 0 && (
              <span className={s.chips}>{o.tags.map((t) => <span key={t} className={s.chip}>{t}</span>)}</span>
            )}
          </span>
      {o.id === value ? <Tick /> : <span />}
    </button>
  );
}

/** Three abreast, each carrying its own numbers. Equipment. */
export function ChoiceCards({ options, value, onChange, onAsk }: {
  options: readonly Option[]; value: string | null; onChange: (id: string) => void;
  onAsk?: (id: string) => void;
}) {
  void onAsk;
  return (
    <div className={s.cards} role="radiogroup" data-testid="choices">
      {options.map((o) => (
        <button key={o.id} type="button" role="radio" aria-checked={o.id === value}
                className={`${s.pick} ${o.id === value ? s.picked : ""}`} onClick={() => onChange(o.id)}>
          <span className={s.pickName}>{o.name}</span>
          {o.role !== undefined && <span className={s.pickNote}>{o.role}</span>}
        </button>
      ))}
    </div>
  );
}

/** A checkbox row with a trailing value. Skills. */
export function CheckList({ options, values, onToggle, trailing, onAsk }: {
  options: readonly Option[];
  values: readonly string[];
  onToggle: (id: string) => void;
  trailing?: (o: Option) => ReactNode;
  /** Held down, a row explains itself — the same accelerator the pickers use. */
  onAsk?: (id: string) => void;
}) {
  return (
    <div className={s.list} data-testid="choices">
      {options.map((o) => (
        <CheckRow key={o.id} option={o} values={values} onToggle={onToggle}
                  {...(trailing === undefined ? {} : { trailing })}
                  {...(onAsk === undefined ? {} : { onAsk })} />
      ))}
    </div>
  );
}

/* Its own component because the hold is a hook, and a hook cannot live inside
   a `map`. */
function CheckRow({ option: o, values, onToggle, trailing, onAsk }: {
  option: Option;
  values: readonly string[];
  onToggle: (id: string) => void;
  trailing?: (o: Option) => ReactNode;
  onAsk?: (id: string) => void;
}) {
  const hold = useLongPress(() => onAsk?.(o.id));
  const granted = o.held !== undefined;
  const barred = o.blocked !== undefined;
  const on = granted || values.includes(o.id);
  return (
    <button type="button" role="checkbox" aria-checked={on} disabled={granted || barred}
            className={`${s.row} ${on ? s.picked : ""} ${granted || barred ? s.granted : ""}`}
            {...(onAsk === undefined ? {} : hold)}
            onClick={() => !granted && !barred && onToggle(o.id)}>
      {on ? <Tick /> : <span className={s.value} aria-hidden="true">·</span>}
      <span className={s.stack}>
        <span className={s.name}>{o.name}</span>
        {barred && <span className={s.role}>{o.blocked}</span>}
      </span>
      <span className={s.value}>{granted ? o.held : trailing?.(o)}</span>
    </button>
  );
}

/**
 * A heading over a slice of a list, with what that slice is asking for.
 *
 * Equipment and proficiencies are both "one from each of these lines", which
 * is neither one question nor a single count — a Fighter answers four, and a
 * Half-Elf Bard with a Criminal background answers three from three different
 * pools. So the shape is a run of small questions on one screen.
 */
export function Quota({ label, note, limit, children }: {
  label: string; note?: string; limit?: number; children: ReactNode;
}) {
  return (
    // Structural, so a journey test can satisfy each pool rather than
    // spending every pick on the first one.
    <div className={s.group} data-testid="quota" data-limit={limit}>
      <span className={s.groupName}>
        {label}
        {note !== undefined && <span className={s.groupNote}> · {note}</span>}
      </span>
      {children}
    </div>
  );
}
