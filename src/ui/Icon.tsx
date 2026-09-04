/**
 * The icon set. SVG, never a glyph — 17 of 39 candidate characters render as
 * colour emoji somewhere and four cannot be stopped, including the die.
 *
 * Every path is stroked with `currentColor`, so an icon inherits the meaning
 * of wherever it sits and can never arrive in a colour that means something
 * else. One viewBox, one stroke width, so they sit together.
 */
export type IconName =
  | "sword" | "staff" | "note" | "sun" | "leaf" | "fist" | "shield" | "bow"
  | "dagger" | "spark" | "book" | "eye" | "die" | "pact" | "flask" | "person"
  | "list" | "moon" | "pin" | "clipboard"
  /* Added for the turn menu (`rules/5e/actions.ts`). V1 had its own set and
     V2's did not cover these four. */
  | "dash" | "slip" | "clock" | "search";

const PATHS: Record<IconName, string> = {
  sword: "M14.5 3.5 17 6l-7.5 7.5-2.5-2.5L14.5 3.5ZM7 13l-2 4 4-2M5.5 15.5 3 18",
  staff: "M14 3 6 19M11 6h6M4 10h5",
  note: "M8 16V5l8-2v11M8 16a2 2 0 1 1-4 0 2 2 0 0 1 4 0ZM16 14a2 2 0 1 1-4 0 2 2 0 0 1 4 0Z",
  sun: "M10 4v2M10 14v2M4 10h2M14 10h2M6 6l1.5 1.5M14 6l-1.5 1.5M6 14l1.5-1.5M14 14l-1.5-1.5M12.5 10a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0Z",
  leaf: "M4 16C4 9 9 4 16 4c0 7-5 12-12 12ZM7 13l6-6",
  fist: "M6 9V6.5a1.5 1.5 0 0 1 3 0V9m0 0V5.5a1.5 1.5 0 0 1 3 0V9m0 0V6.5a1.5 1.5 0 0 1 3 0V12a5 5 0 0 1-5 5H9a5 5 0 0 1-3-2l-2-3",
  shield: "M10 3 4 5.5v4.8c0 3.6 2.4 6.8 6 7.7 3.6-.9 6-4.1 6-7.7V5.5L10 3Z",
  bow: "M5 3c6 2 9 6 10 14M5 3l3 6M5 3l6 3M15 17l-9-4",
  dagger: "M10 3v9M7 12h6l-3 5-3-5ZM6 9h8",
  spark: "M10 3v14M3 10h14M5.5 5.5l9 9M14.5 5.5l-9 9",
  book: "M4 4.5A2 2 0 0 1 6 3h9v13H6a2 2 0 0 0-2 1.5V4.5ZM15 16v2H6",
  eye: "M2 10s3-5 8-5 8 5 8 5-3 5-8 5-8-5-8-5ZM12 10a2 2 0 1 1-4 0 2 2 0 0 1 4 0Z",
  die: "M4 6.5 10 3l6 3.5v7L10 17l-6-3.5v-7ZM4 6.5 10 10l6-3.5M10 10v7",
  pact: "M10 17s-6-3.6-6-8a3.4 3.4 0 0 1 6-2 3.4 3.4 0 0 1 6 2c0 4.4-6 8-6 8Z",
  flask: "M8 3h4M9 3v5l-4 7a1.6 1.6 0 0 0 1.4 2.4h7.2A1.6 1.6 0 0 0 15 15l-4-7V3M6.5 13h7",
  person: "M10 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM4 17c0-3.3 2.7-5 6-5s6 1.7 6 5",
  /* The log: entries, newest at the top. `book` would have done, but it is
     the Library's glyph the day the Library exists. */
  list: "M4 5.5h12M4 10h12M4 14.5h7",
  /* The monk. Added because barbarian and monk shared `fist`, and two classes
     with one shape is the thing the icons exist to prevent — V1's note: they
     are "thirteen different SHAPES rather than thirteen tinted copies of one",
     which is what replaced a colour per class. */
  /* A place, for the outline and Quick Create. The mockup's map pin. */
  pin: "M10 17s5-4.6 5-9a5 5 0 0 0-10 0c0 4.4 5 9 5 9ZM12 8a2 2 0 1 1-4 0 2 2 0 0 1 4 0Z",
  /* The session itself — what the whole night is, before its parts. */
  dash: "M3 10h9M9 6l4 4-4 4M15 5v10M18 5v10",
  slip: "M4 15c3-1 5-3 6-6M10 9l3-3 3 3M13 6v7M3 17h14",
  clock: "M10 5v5l3 2M17 10a7 7 0 1 1-14 0 7 7 0 0 1 14 0Z",
  search: "M12.5 12.5 17 17M14 9a5 5 0 1 1-10 0 5 5 0 0 1 10 0Z",
  clipboard: "M7.5 4H6a1.5 1.5 0 0 0-1.5 1.5v10A1.5 1.5 0 0 0 6 17h8a1.5 1.5 0 0 0 1.5-1.5v-10A1.5 1.5 0 0 0 14 4h-1.5M7.5 4a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1M7.5 4a1 1 0 0 0 1 1h3a1 1 0 0 0 1-1M7.5 9.5h5M7.5 13h3",
  moon: "M16 12.3A6.5 6.5 0 0 1 7.7 4 7 7 0 1 0 16 12.3Z",
};

export function Icon({ name, size = 20 }: { name: IconName; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" aria-hidden="true"
         stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <path d={PATHS[name]} />
    </svg>
  );
}

/** What each class looks like, when a list of twelve names is not a choice. */
const CLASS_ICON: Record<string, IconName> = {
  barbarian: "fist", bard: "note", cleric: "sun", druid: "leaf",
  fighter: "sword", monk: "moon", paladin: "shield", ranger: "bow",
  rogue: "dagger", sorcerer: "spark", warlock: "pact", wizard: "staff",
  artificer: "flask",
};

export const iconForClass = (id: string): IconName => CLASS_ICON[id] ?? "book";

/**
 * The brand marks. Larger and more detailed than the interface icons, so they
 * live apart from the 20×20 set: a crest for the header, a shield for a level.
 */
export function Crest({ size = 34 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" aria-hidden="true">
      <path d="M20 3 34.7 11.5v17L20 37 5.3 28.5v-17z" stroke="var(--gold-edge)" strokeWidth="1.3"
            strokeLinejoin="round" />
      <path d="M20 3 27 20l-7 17-7-17z M5.3 11.5 20 20l14.7-8.5 M5.3 28.5 20 20l14.7 8.5"
            stroke="var(--gold-edge)" strokeWidth="0.9" strokeLinejoin="round" opacity="0.65" />
      <text x="20" y="24" textAnchor="middle" fontSize="10" fontWeight="600"
            fill="var(--gold-ink)" fontFamily="var(--font-mono)">20</text>
    </svg>
  );
}

export function LevelShield({ level, size = 46 }: { level: number; size?: number }) {
  return (
    <svg width={size} height={size * 1.15} viewBox="0 0 40 46" fill="none" aria-hidden="true">
      <path d="M20 2 37 8v18c0 9-8 15.5-17 18C11 41.5 3 35 3 26V8z"
            fill="var(--gold-wash)" stroke="var(--gold-edge)" strokeWidth="1.4" strokeLinejoin="round" />
      <text x="20" y="30" textAnchor="middle" fontSize="19" fontWeight="600"
            fill="var(--gold-ink)" fontFamily="var(--font-mono)">{level}</text>
    </svg>
  );
}
