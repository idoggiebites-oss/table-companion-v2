import { useEffect, useState } from "react";
import { loadList } from "../../content/load";
import type { Item } from "../../rules/5e/items";

/**
 * The item catalogue, fetched when the Inventory tab opens and not before.
 *
 * 10,760 items, 133KB gzipped — worth having when somebody is looking at
 * their pack, and not worth making every player pull on the way to a fight.
 * The same reasoning as the spellbook, and V1's: a fighter's phone should not
 * be paying for a wizard's picker.
 */
export function useCatalogue(want: boolean): { items: readonly Item[]; loading: boolean } {
  const [items, setItems] = useState<readonly Item[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!want || items.length > 0) return;
    let live = true;
    setLoading(true);
    void loadList<Item>("/content/index/item.json").then((rows) => {
      if (live) { setItems(rows); setLoading(false); }
    });
    return () => { live = false; };
  }, [want, items.length]);

  return { items, loading };
}
