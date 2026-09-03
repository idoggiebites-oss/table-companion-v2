import { isArmour, isShield, isWeapon, hasProperty, type Item } from "./items";

/**
 * What is worn where.
 *
 * 5e has no slot system. It has sentences — "you can wear only one pair of
 * boots", "a shield is carried in one hand" — and a table that remembers them.
 * So this is not the rules made explicit; it is a reading of what a character
 * has equipped, arranged the way a person pictures themselves.
 *
 * Six places, because six is what a phone holds beside a figure and because
 * every one of them answers a question somebody asks at a table: what am I
 * hitting with, what is in my other hand, what am I wearing, and the three
 * that magic items land in.
 *
 * Anything equipped that fits none of them is still equipped — a ring beyond
 * the first, a lantern. Those are named separately rather than forced into a
 * slot they do not belong in, because inventing a slot system and then lying
 * about which slot something is in is worse than admitting the list is short.
 */
export type SlotId = "main" | "off" | "armor" | "cloak" | "boots" | "trinket";

export type Slot = { readonly id: SlotId; readonly name: string; readonly what: string };

/** Drawn as the concept draws it: two hands, then the three worn places. */
export const SLOTS: readonly Slot[] = [
  { id: "main", name: "Main hand", what: "what you attack with" },
  { id: "off", name: "Off hand", what: "a shield, or a second weapon" },
  { id: "armor", name: "Armor", what: "what you are wearing" },
  { id: "cloak", name: "Cloak", what: "a cloak or mantle" },
  { id: "boots", name: "Boots", what: "boots, shoes, sandals" },
  { id: "trinket", name: "Trinket", what: "a ring, an amulet, a charm" },
];

/*
 * Read off the name, because the catalogue does not say. 10,760 items carry a
 * category and a set of armour or weapon numbers and nothing about where they
 * sit on a body — so a Cloak of Protection is "adventuring-gear" like a coil
 * of rope. The words are the only signal there is.
 */
const BY_NAME: readonly { readonly slot: SlotId; readonly re: RegExp }[] = [
  { slot: "cloak", re: /\b(cloak|cape|mantle|shawl)\b/i },
  { slot: "boots", re: /\b(boots|shoes|sandals|slippers|greaves)\b/i },
  { slot: "trinket", re: /\b(ring|amulet|necklace|pendant|talisman|charm|brooch|periapt|medallion)\b/i },
];

/**
 * Where this item goes, or null for the things a six-slot picture cannot hold.
 * `taken` is what is already filled, so the second sword a character draws
 * lands in the other hand rather than replacing the first.
 */
export function slotFor(item: Item, taken: ReadonlySet<SlotId> = new Set()): SlotId | null {
  if (isShield(item)) return "off";
  if (isArmour(item)) return "armor";
  if (isWeapon(item)) {
    if (!taken.has("main")) return "main";
    if (!taken.has("off")) return "off";
    return null;
  }
  for (const { slot, re } of BY_NAME) if (re.test(item.name)) return slot;
  return null;
}

export type Figure = {
  readonly slots: Readonly<Record<SlotId, Item | null>>;
  /** Equipped, and in none of the six. Still worn, still counted. */
  readonly elsewhere: readonly Item[];
};

/**
 * The figure, filled in.
 *
 * Order matters and is the caller's: whatever was equipped first takes the
 * main hand. Two shields, or a third weapon, land in `elsewhere` rather than
 * quietly displacing what is already held.
 */
export function figureOf(items: readonly Item[]): Figure {
  const slots: Record<SlotId, Item | null> = {
    main: null, off: null, armor: null, cloak: null, boots: null, trinket: null,
  };
  const elsewhere: Item[] = [];
  const taken = new Set<SlotId>();
  for (const item of items) {
    const at = slotFor(item, taken);
    if (at === null || slots[at] !== null) { elsewhere.push(item); continue; }
    slots[at] = item;
    taken.add(at);
  }
  return { slots, elsewhere };
}

/**
 * Rarity, shown as a rim rather than a fill.
 *
 * Red already means damage here, green means healing and violet means
 * concentration, so rarity cannot have a hue of its own without teaching the
 * wrong thing. It climbs one hue — the structural steel — into gold at the
 * top, and the word is always available underneath.
 */
export type Rarity = "common" | "uncommon" | "rare" | "very rare" | "legendary";

const RARITIES: readonly Rarity[] = ["common", "uncommon", "rare", "very rare", "legendary"];

export function rarityOf(item: Item): Rarity | null {
  const said = `${item.detail ?? ""} ${item.name}`.toLowerCase();
  // Longest first: "very rare" contains "rare".
  for (const r of ["legendary", "very rare", "uncommon", "rare", "common"] as const) {
    if (said.includes(r)) return r;
  }
  return item.magic === true ? "rare" : null;
}

/** How bright the rim gets. Nothing for ordinary kit. */
export const rarityStep = (item: Item): number => {
  const r = rarityOf(item);
  return r === null ? 0 : RARITIES.indexOf(r);
};

/** Both hands means both hands. */
export const usesBothHands = (item: Item): boolean =>
  isWeapon(item) && hasProperty(item, "two-handed");

/**
 * What has to come off for this to go on.
 *
 * V1's note, and the reason this exists: a greatsword and a shield is not a
 * thing, and the app allowed it and quietly handed out the armour class for
 * it. Rather than refuse the press — which leaves a person poking at a button
 * that does nothing, with no reason given — the other hand is emptied, because
 * that is what a person does when they pick up a greatsword. It comes back as
 * events, so it is in the log, it is undoable, and the table can see that the
 * shield went away.
 */
export function displacedBy(item: Item, equipped: readonly Item[]): Item[] {
  const hands = equipped.filter((i) => isWeapon(i) || isShield(i));
  if (usesBothHands(item)) return hands.filter((i) => i.id !== item.id);
  if (isWeapon(item) || isShield(item)) {
    return hands.filter((i) => i.id !== item.id && usesBothHands(i));
  }
  // Armour displaces armour, a cloak a cloak: one slot, one thing.
  const at = slotFor(item);
  if (at === null) return [];
  return equipped.filter((i) => i.id !== item.id && slotFor(i) === at);
}
