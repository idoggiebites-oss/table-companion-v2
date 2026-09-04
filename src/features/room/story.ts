import { isSkip } from "../../core/log";
import type { Event } from "../../core/types";
import { conditionById } from "../../rules/5e/conditions";
import { describeRoom } from "../../rules/5e/terrain";
import type { Room } from "../../rules/5e/terrain";

/**
 * What happened, in a sentence.
 *
 * V2's log was still Slice 1's debug view. `LogView` printed a sequence
 * number, the raw event kind — `fight.act`, `sheet.vital` — and a device id,
 * so a night at the table read as forty rows of "fight.act d3f9a1". Its own
 * comment noticed half the problem: *"it was Slice 1's debug view and said so,
 * which was true until the app went on a URL a player could open."* The
 * visibility half was fixed. The legibility half was not.
 *
 * V1's `Feed.tsx` is the specification, and it is a `describe()` per event:
 * *"Kira took 12"*, *"The party found 25 gp"*, *"Kira is no longer poisoned"*.
 * That is what makes the log a thing people read rather than a thing the
 * developer reads.
 *
 * **Null means the row is not drawn.** V1's rule, and its example is the one
 * that matters: `turnAdvanced` returns null because *"the feed would be
 * nothing but this"*. A log where every third row says "next turn" has buried
 * the two rows somebody actually wanted.
 */

/** Names for characters AND combatants — a fight row says who, or says nothing. */
export type NameOf = (id: string) => string | undefined;

const who = (n: NameOf, id: unknown): string =>
  (typeof id === "string" ? n(id) : undefined) ?? "Someone";

const it = (n: NameOf, id: unknown): string =>
  (typeof id === "string" ? n(id) : undefined) ?? "A creature";

const num = (v: unknown): number => (typeof v === "number" ? v : 0);
const str = (v: unknown): string => (typeof v === "string" ? v : "");

/** Conditions read as what they DO where there is room; here, as their name. */
const condition = (id: unknown): string => conditionById(str(id))?.name.toLowerCase() ?? str(id);

function vital(d: Readonly<Record<string, unknown>>, n: NameOf): string | null {
  const subject = who(n, d["character"]);
  switch (str(d["act"])) {
    case "damage": return `${subject} took ${String(num(d["n"]))}`;
    case "heal": return `${subject} healed ${String(num(d["n"]))}`;
    case "temp": return `${subject} gained ${String(num(d["n"]))} temporary`;
    case "hitdie":
      return `${subject} spent a d${String(num(d["die"]))} · rolled ${String(num(d["rolled"]))}`;
    case "rest":
      return `${str(d["length"]) === "long" ? "Long" : "Short"} rest · ${subject}`;
    case "condition":
      return d["on"] === true
        ? `${subject} is ${condition(d["id"])}`
        : `${subject} is no longer ${condition(d["id"])}`;
    case "death": {
      const r = str(d["result"]);
      if (r === "clear") return `${subject}'s death saves cleared`;
      return `${subject} · death save ${r === "success" ? "made" : "failed"}`;
    }
    case "exhaustion": return `${subject} exhaustion ${String(num(d["n"]))}`;
    case "inspiration":
      return `${subject} ${d["on"] === true ? "gained" : "spent"} inspiration`;
    case "concentrate": {
      const spell = str(d["spell"]);
      return spell === ""
        ? `${subject} lost concentration`
        : `${subject} is concentrating on ${spell}`;
    }
    case "attack": {
      const a = d["attack"];
      const name = typeof a === "object" && a !== null ? str((a as Record<string, unknown>)["name"]) : "";
      return `${subject} can swing ${name === "" ? "something new" : name}`;
    }
    case "unattack": return `${subject} put ${str(d["name"])} away`;
    default: return null;
  }
}

function fight(d: Readonly<Record<string, unknown>>, n: NameOf): string | null {
  switch (str(d["act"])) {
    /* The act carries the name BEFORE `nameFor` numbers it, so two goblins
       both logged "Goblin is on the table". The fight knows which is which. */
    case "stage": return `${it(n, d["id"]) === "A creature" ? str(d["name"]) : it(n, d["id"])} is on the table`;
    case "unstage": return `${it(n, d["id"])} left the table`;
    case "roll": return `${it(n, d["id"])} rolled ${String(num(d["value"]))} for initiative`;
    case "hurt": {
      const amount = num(d["amount"]);
      return amount < 0
        ? `${it(n, d["id"])} healed ${String(Math.abs(amount))}`
        : `${it(n, d["id"])} took ${String(amount)}`;
    }
    case "condition":
      return d["on"] === true
        ? `${it(n, d["id"])} is ${condition(d["condition"])}`
        : `${it(n, d["id"])} is no longer ${condition(d["condition"])}`;
    case "disclose": return `${it(n, d["id"])} — the table now sees ${str(d["to"])}`;
    case "claim": {
      const c = d["claim"];
      if (typeof c !== "object" || c === null) return "A swing was claimed";
      const k = c as Record<string, unknown>;
      return `${str(k["whoName"])} swings ${str(k["weapon"])} — ${String(num(k["toHit"]))} to hit`;
    }
    case "verdict": return d["lands"] === true ? "It lands" : "It misses";
    case "begin": return "Roll for initiative — the fight is on";
    case "clear": return "The table is cleared";
    case "room": {
      const said = describeRoom(d["room"] as Room);
      return said === "" ? "Open ground" : `The room: ${said}`;
    }
    /* V1: "the feed would be nothing but this." */
    case "advance": return null;
    default: return null;
  }
}

/** Prep never reaches a player's log at all — see `visibility.ts`. */
function prep(kind: string, d: Readonly<Record<string, unknown>>): string | null {
  const act = str(d["act"]);
  const named = (k: string): string => {
    const v = d[k];
    return typeof v === "object" && v !== null ? str((v as Record<string, unknown>)["name"]) : "";
  };
  if (act === "forget") return "Threw something away";
  switch (kind) {
    case "prep.act":
      return act === "keep" ? `Kept ${named("encounter") || "an encounter"}` : null;
    case "scene.act":
      if (act === "prepare") return `Prepared ${named("scene") || "a place"}`;
      if (act === "room") {
        const said = describeRoom(d["room"] as Room);
        return said === "" ? "Open ground" : `The room: ${said}`;
      }
      return null;
    case "session.act": {
      const v = d["session"];
      const title = typeof v === "object" && v !== null
        ? str((v as Record<string, unknown>)["title"]) : "";
      return act === "save" ? `Planned ${title || "a session"}` : null;
    }
    case "npc.act": return act === "save" ? `Wrote down ${named("npc") || "someone"}` : null;
    case "homebrew.act": return act === "save" ? `Made ${named("item") || "something"}` : null;
    default: return null;
  }
}

export function describe(e: Event, nameOf: NameOf): string | null {
  /* The marker shows ON the row it undid, struck through — never as a row of
     its own. V1's rule, and `LogView` already draws it that way. */
  if (isSkip(e)) return null;
  switch (e.kind) {
    case "sheet.vital": return vital(e.data, nameOf);
    case "fight.act": return fight(e.data, nameOf);
    /*
     * One row per character, not thirty per creation.
     *
     * Building someone appends a choice per step, and printing them all buried
     * a night under "chose a class, chose a background, chose a skill". V1 logs
     * the arrival and nothing else — "Bree Thorn joined" — so only the step
     * that NAMES them draws a row, which is also the step creation ends on.
     */
    case "creation.choose": {
      if (str(e.data["step"]) !== "identity") return null;
      const ident = e.data["identity"];
      const name = typeof ident === "object" && ident !== null
        ? str((ident as Record<string, unknown>)["name"]) : "";
      return name === "" ? null : `${name} joined`;
    }
    /* The Append button's own event. It has always been a developer
       affordance, but the log is append-only and deployed devices hold real
       ticks — so it gets a sentence rather than vanishing from histories that
       already contain it. */
    case "tick": return "Marked the log";
    case "progress.take": return `${who(nameOf, e.data["character"])} levelled up`;
    default: return prep(e.kind, e.data);
  }
}
