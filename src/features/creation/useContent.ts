import { useEffect, useState } from "react";
import { loadKind, loadMap, loadList } from "../../content/load";
import type { Entry, SpellEntry, RaceEntry, ClassEntry, BackgroundEntry } from "../../content/schema";
import { contentFrom, type Loaded, type Paths, type Styles, type Tool, type Armour, type Choices, type Weapon } from "./compendium";
import { isMarked } from "../../content/source";
import { SRD_ONLY, type CreationContent } from "./content";
import { contentUrl } from "../../content/base";
import { STYLE } from "../../content/choicepoints";

export type ContentState = {
  readonly content: CreationContent;
  readonly ready: boolean;
  /** How many rows the compendium added. Zero means the fallback is in use. */
  readonly rows: number;
  /** How many are hidden by the switch right now. */
  readonly hidden: number;
};

/**
 * Loads the compiled compendium, and falls back to the SRD-shaped content when
 * there is none. Absent is normal: a deployment built without running the
 * compendium build still creates characters, and that is the only
 * redistributable configuration.
 */
export function useCreationContent(onlyGames = true, wantSpells = false): ContentState {
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [ready, setReady] = useState(false);

  /*
   * The spell index is 1.2MB of the 1.5MB a device pulls, and only the Spells
   * step ever reads it. Everything else — 77 ancestries, 18 classes, the
   * backgrounds and every subclass — is 376KB together. So the small chunks
   * load on arrival and the spellbook waits until a caster asks for it.
   */
  useEffect(() => {
    let live = true;
    void (async () => {
      const [races, classes, backgrounds, paths, tools, armour, feats, choices, weapons] = await Promise.all([
        loadKind<RaceEntry>("race"),
        loadKind<ClassEntry>("class"),
        loadKind<BackgroundEntry>("background"),
        loadMap<Paths[string]>(contentUrl("index/path.json")),
        // 54 rows, 1KB. The item index it was cut from is 133KB and is never
        // loaded by the builder.
        loadList<Tool>(contentUrl("index/tool.json")),
        loadList<Armour>(contentUrl("index/armour.json")),
        // 14KB gzipped, and two steps need it: a variant human's granted feat
        // and an improvement spent on one instead of ability points.
        loadKind<Entry>("feat"),
        loadMap<Choices[string]>(contentUrl("index/choice.json")),
        loadList<Weapon>(contentUrl("index/weapon.json")),
      ]);
      if (!live) return;
      /*
       * Fighting styles are DERIVED from the class's own questions, not
       * fetched.
       *
       * `choicepoints` is the one rule for everything a class asks — a
       * subclass, a fighting style, Metamagic, a Pact Boon — and it already
       * emits "Fighting Style" with every option. A separate `index/style.json`
       * was the last of the special case that rule replaced: a second copy of
       * the same answers, which the compiler no longer writes, so the request
       * 404'd and the dedicated screen quietly vanished. The class asks; this
       * reads the question it already asked.
       */
      const styles: Styles = Object.fromEntries(
        Object.entries(choices).flatMap(([id, points]) => {
          const p = points.find((x) => x.of === STYLE);
          return p === undefined ? [] : [[id, { level: p.level, options: p.options }] as const];
        }),
      );
      setLoaded({ races, classes, backgrounds, spells: [], paths, styles, tools, armour, feats, choices, weapons });
      setReady(true);
    })();
    return () => { live = false; };
  }, []);

  useEffect(() => {
    if (!wantSpells) return;
    let live = true;
    void loadKind<SpellEntry>("spell").then((spells) => {
      if (live) setLoaded((p) => (p === null ? p : { ...p, spells }));
    });
    return () => { live = false; };
  }, [wantSpells]);

  const rows = loaded === null ? 0 : loaded.races.length + loaded.classes.length + loaded.backgrounds.length;
  if (loaded === null || rows === 0) {
    return { content: SRD_ONLY, ready, rows: 0, hidden: 0 };
  }
  const hidden = loaded.races.filter((r) => isMarked(r.provenance)).length;
  return { content: contentFrom(loaded, { onlyGames }), ready, rows, hidden };
}
