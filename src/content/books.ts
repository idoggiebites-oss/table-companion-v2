/**
 * The nineteen official books, in publication order — the order a table's
 * shelf grew in. 2014 rules only: an "origin" is a 2024 idea and has no place
 * here.
 *
 * Nothing is hidden by this table. Provenance does the hiding; this decides
 * the heading, and anything unfiled lands under "elsewhere" and stays visible.
 */
export type Book = { readonly id: string; readonly name: string; readonly short: string; readonly year: number };

export const BOOKS: readonly Book[] = [
  { id: "phb", name: "Player's Handbook", short: "Player's Handbook", year: 2014 },
  { id: "dmg", name: "Dungeon Master's Guide", short: "Dungeon Master's Guide", year: 2014 },
  { id: "scag", name: "Sword Coast Adventurer's Guide", short: "Sword Coast", year: 2015 },
  { id: "vgm", name: "Volo's Guide to Monsters", short: "Volo's", year: 2016 },
  { id: "xge", name: "Xanathar's Guide to Everything", short: "Xanathar's", year: 2017 },
  { id: "mtf", name: "Mordenkainen's Tome of Foes", short: "Mordenkainen's", year: 2018 },
  { id: "ggr", name: "Guildmasters' Guide to Ravnica", short: "Ravnica", year: 2018 },
  { id: "acq", name: "Acquisitions Incorporated", short: "Acquisitions Inc", year: 2019 },
  { id: "erlw", name: "Eberron: Rising from the Last War", short: "Eberron", year: 2019 },
  { id: "egw", name: "Explorer's Guide to Wildemount", short: "Wildemount", year: 2020 },
  { id: "mot", name: "Mythic Odysseys of Theros", short: "Theros", year: 2020 },
  { id: "tce", name: "Tasha's Cauldron of Everything", short: "Tasha's", year: 2020 },
  { id: "vrgr", name: "Van Richten's Guide to Ravenloft", short: "Ravenloft", year: 2021 },
  { id: "ftd", name: "Fizban's Treasury of Dragons", short: "Fizban's", year: 2021 },
  { id: "scoc", name: "Strixhaven: A Curriculum of Chaos", short: "Strixhaven", year: 2021 },
  { id: "sjag", name: "Spelljammer: Astral Adventurer's Guide", short: "Spelljammer", year: 2022 },
  { id: "dsotdq", name: "Dragonlance: Shadow of the Dragon Queen", short: "Dragonlance", year: 2022 },
  { id: "bgg", name: "Bigby Presents: Glory of the Giants", short: "Bigby's", year: 2023 },
  { id: "plan", name: "Planescape: Adventures in the Multiverse", short: "Planescape", year: 2023 },

  /*
   * The rest of what the game actually published. The nineteen above are the
   * hardcovers a table thinks of as "the books"; these are the adventures,
   * companions and free releases that also carry player options, and every
   * one of them appeared in the shipped file as an unmatched source.
   *
   * They matter because of the rule below: a source that matches nothing here
   * is not the game's own. Without them, Curse of Strahd's backgrounds and
   * the Wild Beyond the Witchlight's ancestries would be filed as somebody's
   * homebrew.
   */
  { id: "eepc", name: "Elemental Evil Player's Companion", short: "Elemental Evil", year: 2015 },
  { id: "cos", name: "Curse of Strahd", short: "Ravenloft", year: 2016 },
  { id: "toa", name: "Tomb of Annihilation", short: "Annihilation", year: 2017 },
  { id: "oga", name: "One Grung Above", short: "One Grung Above", year: 2017 },
  { id: "tortle", name: "The Tortle Package", short: "Tortle", year: 2017 },
  { id: "llk", name: "Lost Laboratory of Kwalish", short: "Kwalish", year: 2018 },
  { id: "gos", name: "Ghosts of Saltmarsh", short: "Saltmarsh", year: 2019 },
  { id: "bgdia", name: "Baldur's Gate: Descent Into Avernus", short: "Avernus", year: 2019 },
  { id: "locathah", name: "Locathah Rising", short: "Locathah Rising", year: 2020 },
  { id: "muk", name: "Adventure with Muk", short: "Muk", year: 2020 },
  { id: "idrotf", name: "Icewind Dale: Rime of the Frostmaiden", short: "Icewind Dale", year: 2020 },
  { id: "wbtw", name: "The Wild Beyond the Witchlight", short: "Witchlight", year: 2021 },
  { id: "mpmm", name: "Mordenkainen Presents: Monsters of the Multiverse", short: "Multiverse", year: 2022 },
  { id: "sais", name: "Spelljammer: Adventures in Space", short: "Spelljammer", year: 2022 },
  { id: "bomt", name: "The Book of Many Things", short: "Many Things", year: 2023 },
];

/**
 * Official material that is a family rather than a book: WotC's free Plane
 * Shift releases, and Adventurers League's organised-play supplements. Filed
 * under "elsewhere" for the purpose of a heading, but official all the same.
 */
const OFFICIAL_FAMILIES: readonly RegExp[] = [
  /^plane shift/i,
  /^adventurers? league/i,
  /^mulmaster bonds and backgrounds/i,
];

const BY_ID = new Map(BOOKS.map((b) => [b.id, b]));

/** What to call a book in a heading. "Elsewhere" is not a failure state. */
export const bookName = (id: string | null): string => BY_ID.get(id ?? "")?.short ?? "Elsewhere";

const ORDER = new Map(BOOKS.map((b, i) => [b.id, i]));
/** Publication order; anything unfiled sorts last, under "elsewhere". */
export const bookOrder = (id: string | null): number =>
  id === null ? Number.MAX_SAFE_INTEGER : (ORDER.get(id) ?? Number.MAX_SAFE_INTEGER);

const key = (s: string) =>
  s.toLowerCase().replace(/\(\d{4}\)/g, "").replace(/[^a-z ]/g, " ").replace(/\s+/g, " ").trim();

const INDEX = new Map(BOOKS.map((b) => [key(b.name), b.id]));

/**
 * Match a source string to one of the nineteen. The compendium writes them
 * with page numbers, edition years and subtitles attached, so the comparison
 * is on a normalised key and a prefix, never on equality.
 */
/**
 * Is this source the game's own at all?
 *
 * The presence of a `Source:` line is NOT the answer — every third-party
 * publication carries one too. "Matthew Mercer - Gunslinger Martial Archetype"
 * is a source line, and a Gunslinger is not a fighter archetype the game
 * printed. Official means a positive match, here or in the families above.
 */
export function isOfficialSource(source: string): boolean {
  if (source.trim() === "") return false;
  if (bookOf(source) !== null) return true;
  return OFFICIAL_FAMILIES.some((re) => re.test(source.trim()));
}

export function bookOf(source: string): string | null {
  const k = key(source.split(" - ")[0] ?? source);
  const exact = INDEX.get(k);
  if (exact !== undefined) return exact;
  for (const [name, id] of INDEX) if (k.startsWith(name) || name.startsWith(k)) return id;
  return null;
}
