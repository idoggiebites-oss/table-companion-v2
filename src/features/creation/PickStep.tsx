import { useState } from "react";
import { StepShell, Counter, Arrived } from "../../ui/step/StepShell";
import { ChoiceGrid, ChoiceList, ChoiceCards, CheckList, Quota, type Option, type Group } from "../../ui/step/Choices";
import { DetailCard, Prose, Segmented } from "../../ui/step/Controls";
import { useProse } from "./useProse";
import type { StepId } from "../../rules/5e/steps";
import { Button, ButtonRow } from "../../ui/Button";

type Common = {
  title: string;
  question: string;
  sub?: string;
  index: number;
  total: number;
  stepKey?: string | undefined;
  direction?: "forward" | "back" | undefined;
  options: readonly Option[];
  detail?: (picked: readonly string[]) => { label: string; lead?: string; lines?: readonly string[] } | undefined;
  arrived?: string;
  onBack?: () => void;
};

/**
 * Ancestry, Lineage, Class, Path, Background — one question, one answer.
 * `shape` is the only thing that differs, so there is one screen rather than
 * five that drift apart.
 */
export function PickOneStep({
  shape = "list", value, step, onContinue, ...c
}: Common & {
  shape?: "grid" | "list" | "cards";
  value?: string | null;
  /** Which pile this step's prose comes out of. */
  step?: StepId;
  onContinue: (id: string) => void;
}) {
  const [picked, setPicked] = useState<string | null>(value ?? null);
  /*
   * Held down, a row explains itself. This is the ONLY way in.
   *
   * The card used to open on selection as well, and on a device that was
   * plainly wrong: it swallowed a third of the ancestry grid, dropped the
   * visible cards from three and a half rows to two and a half, and — since
   * a step always has something selected once you have chosen — never went
   * away again. What it explained was the choice already made, which is the
   * one thing on the screen that needs no explaining.
   */
  const [asked, setAsked] = useState<string | null>(null);
  const Choices = shape === "grid" ? ChoiceGrid : shape === "cards" ? ChoiceCards : ChoiceList;
  /* A row may name a different record as its explanation — an ancestry group
     borrows its first lineage's, the way it borrows its face. */
  const describes = c.options.find((x) => x.id === asked)?.describe ?? asked;
  const held = asked === null
    ? undefined
    : c.options.find((x) => x.id === asked)?.name ?? asked;
  const prose = useProse(step ?? "identity", describes);
  const card = asked === null ? undefined : (
    <DetailCard
      {...(c.detail?.([asked]) ?? { label: held ?? asked })}
      label={held ?? asked}
      prose={<Prose blocks={prose.blocks} loading={prose.loading} />}
      onClose={() => setAsked(null)}
    />
  );

  return (
    <StepShell
      stepKey={c.stepKey} direction={c.direction}
      title={c.title} question={c.question} index={c.index} total={c.total}
      {...(c.sub === undefined ? {} : { sub: c.sub })}
      {...(c.onBack === undefined ? {} : { onBack: c.onBack })}
      {...(c.arrived === undefined ? {} : { arrived: <Arrived>{c.arrived}</Arrived> })}
      /*
       * Always pinned now, never appended to the scroll. Somebody who holds a
       * row is asking a question, and the answer has to arrive where they are
       * looking — on sixty-eight ancestry cards the end of the scroll is four
       * thousand pixels away.
       */
      {...(card === undefined ? {} : { pinned: card })}
      actions={
        <ButtonRow>
          {c.onBack !== undefined && <Button onClick={c.onBack}>Back</Button>}
          <Button tone="gold" disabled={picked === null} onClick={() => picked !== null && onContinue(picked)}>
            Continue
          </Button>
        </ButtonRow>
      }
    >
      <Choices
        options={c.options}
        value={picked}
        // Choosing a row clears whatever was being read about.
        onChange={(id) => { setAsked(null); setPicked(id); }}
        onAsk={setAsked}
      />
    </StepShell>
  );
}

/**
 * Skills and spells — pick exactly N. The count is pinned above the action bar
 * on every step that has a limit, never at the top of one list and the bottom
 * of another.
 */
export function PickManyStep({
  limit, countLabel, values, trailing, groups, onContinue, ...c
}: Common & {
  limit: number;
  countLabel: string;
  values?: readonly string[];
  trailing?: (o: Option) => string;
  /**
   * Named slices of the list — spell levels, as drawn. Only groups the data
   * can actually support: the concept's Damage/Utility/Control chips are a
   * taxonomy the compendium does not carry, and a filter that is silently
   * wrong for a sixth of the list is worse than no filter.
   */
  groups?: readonly { readonly id: string; readonly label: string; readonly has: (o: Option) => boolean }[] | undefined;
  onContinue: (ids: readonly string[]) => void;
}) {
  const [picked, setPicked] = useState<readonly string[]>(values ?? []);
  const [group, setGroup] = useState<string>(groups?.[0]?.id ?? "");
  /* Asked for by holding a row, never opened by choosing one — see the note in
     `PickOneStep`. A pinned card that explains the last thing ticked is a card
     that is always on screen and always explaining a settled question. */
  const [asked, setAsked] = useState<string | null>(null);
  const toggle = (id: string) =>
    setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : p.length >= limit ? p : [...p, id]));
  const held = asked === null
    ? undefined
    : c.options.find((x) => x.id === asked)?.name ?? asked;

  return (
    <StepShell
      stepKey={c.stepKey} direction={c.direction}
      title={c.title} question={c.question} index={c.index} total={c.total}
      {...(c.sub === undefined ? {} : { sub: c.sub })}
      {...(c.onBack === undefined ? {} : { onBack: c.onBack })}
      {...(c.arrived === undefined ? {} : { arrived: <Arrived>{c.arrived}</Arrived> })}
      {...(asked === null ? {} : {
        pinned: (
          <DetailCard
            {...(c.detail?.([asked]) ?? {})}
            label={held ?? asked}
            onClose={() => setAsked(null)}
          />
        ),
      })}
      counter={<Counter label={countLabel} have={picked.length} need={limit} />}
      actions={
        <ButtonRow>
          {c.onBack !== undefined && <Button onClick={c.onBack}>Back</Button>}
          <Button tone="gold" disabled={picked.length !== limit}
                  onClick={() => picked.length === limit && onContinue(picked)}>
            Continue
          </Button>
        </ButtonRow>
      }
    >
      {groups !== undefined && groups.length > 1 && (
        <Segmented
          label="Which of them"
          value={group}
          onChange={setGroup}
          options={groups.map((g) => ({ id: g.id, label: g.label }))}
        />
      )}
      <CheckList
        options={
          groups === undefined ? c.options
            : c.options.filter((o) => groups.find((g) => g.id === group)?.has(o) ?? true)
        }
        values={picked}
        onToggle={toggle}
        onAsk={setAsked}
        {...(trailing === undefined ? {} : { trailing })}
      />
    </StepShell>
  );
}

/**
 * Several small questions on one screen, each with its own pool and its own
 * count.
 *
 * Equipment is not one choice: a Fighter is offered four lines and answers all
 * four, and a Cleric five. Proficiencies are not one choice either — a
 * Half-Elf Bard with a Criminal background chooses two languages, three
 * instruments and a gaming set, and merging those into "choose six" lets them
 * spend the gaming set on a lute.
 *
 * A group of one behaves as a radio: picking a second answer replaces the
 * first rather than making a person untick before they can change their mind.
 */
export function PickPerGroupStep({
  groups, values, countLabel, onContinue, ...c
}: Omit<Common, "options"> & {
  groups: readonly Group[];
  values?: Readonly<Record<string, readonly string[]>>;
  countLabel: string;
  onContinue: (picked: Readonly<Record<string, readonly string[]>>) => void;
}) {
  const [picked, setPicked] = useState<Readonly<Record<string, readonly string[]>>>(values ?? {});
  const toggle = (group: Group, id: string) =>
    setPicked((p) => {
      const had = p[group.id] ?? [];
      const next = had.includes(id) ? had.filter((x) => x !== id)
        : group.limit === 1 ? [id]
        : had.length >= group.limit ? had
        : [...had, id];
      return { ...p, [group.id]: next };
    });

  const need = groups.reduce((n, g) => n + g.limit, 0);
  const have = groups.reduce((n, g) => n + Math.min((picked[g.id] ?? []).length, g.limit), 0);
  const done = groups.every((g) => (picked[g.id] ?? []).length === g.limit);

  return (
    <StepShell
      stepKey={c.stepKey} direction={c.direction}
      title={c.title} question={c.question} index={c.index} total={c.total}
      {...(c.sub === undefined ? {} : { sub: c.sub })}
      {...(c.onBack === undefined ? {} : { onBack: c.onBack })}
      {...(c.arrived === undefined ? {} : { arrived: <Arrived>{c.arrived}</Arrived> })}
      counter={<Counter label={countLabel} have={have} need={need} />}
      actions={
        <ButtonRow>
          {c.onBack !== undefined && <Button onClick={c.onBack}>Back</Button>}
          <Button tone="gold" disabled={!done} onClick={() => done && onContinue(picked)}>
            Continue
          </Button>
        </ButtonRow>
      }
    >
      {groups.map((g) => (
        <Quota key={g.id} label={g.label} limit={g.limit}
               note={g.note ?? (g.limit === 1 ? "choose one" : `choose ${String(g.limit)}`)}>
          <CheckList options={g.options} values={picked[g.id] ?? []} onToggle={(id) => toggle(g, id)} />
        </Quota>
      ))}
    </StepShell>
  );
}
