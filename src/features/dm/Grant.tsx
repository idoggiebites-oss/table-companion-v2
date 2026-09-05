import { useState } from "react";
import { parseCoins } from "../../rules/5e/money";
import { readPhrase } from "../sheet/carried";
import type { Item } from "../../rules/5e/items";
import type { HoldAct } from "../room/holdings";
import s from "./Grant.module.css";

/**
 * The DM handing something over, or taking it back.
 *
 * *"DM has power to add/remove items, currency … from players."* Both ends of
 * the same move (`holdings.ts`): a grant arrives from nowhere and a
 * confiscation goes to nowhere, which is what a reward and a theft actually
 * are from the party's side.
 *
 * The item is TYPED rather than picked from a list. It is the same door
 * creation uses for a pack — `readPhrase` reads "2 potions of healing" against
 * the catalogue — and a DM mid-session is faster saying it than scrolling six
 * thousand rows. Anything the catalogue does not know still lands, under the
 * name they typed, because a made-up thing is the common case at a table.
 *
 * **Minus takes.** "-50 gp" and "-1 rope" are the same gesture with the sign
 * flipped, which is the shape `hurt` already uses for damage and healing.
 */
export function Grant({ who, catalogue, onHold, onClose }: {
  who: string;
  catalogue: readonly Item[];
  onHold: (act: HoldAct) => void;
  onClose: () => void;
}) {
  const [coins, setCoins] = useState("");
  const [thing, setThing] = useState("");

  const hand = () => {
    const money = coins.trim();
    if (money !== "") {
      const away = money.startsWith("-");
      const copper = parseCoins(away ? money.slice(1) : money);
      if (copper !== null) onHold({ act: "coins", who, copper: away ? -copper : copper });
    }
    const said = thing.trim();
    if (said !== "") {
      const away = said.startsWith("-");
      const phrase = away ? said.slice(1).trim() : said;
      const stack = readPhrase(phrase, catalogue)
        ?? { itemId: `said:${phrase.toLowerCase()}`, name: phrase, qty: 1 };
      onHold(away
        ? { act: "move", from: who, itemId: stack.itemId, name: stack.name, qty: stack.qty }
        : { act: "move", to: who, itemId: stack.itemId, name: stack.name, qty: stack.qty });
    }
    onClose();
  };

  return (
    <span className={s.wrap} role="group" aria-label="Hand something over" data-testid="grant">
      <input className={s.field} value={coins} data-testid="grant-coins"
             placeholder="25 gp" aria-label="Coins, or a minus to take some"
             onChange={(e) => setCoins(e.target.value)} />
      <input className={s.field} value={thing} data-testid="grant-item"
             placeholder="a potion of healing" aria-label="Something, or a minus to take it"
             onChange={(e) => setThing(e.target.value)} />
      <button type="button" className={s.go} data-testid="grant-send" onClick={hand}>Hand over</button>
      <button type="button" className={s.never} onClick={onClose}>Never mind</button>
    </span>
  );
}
