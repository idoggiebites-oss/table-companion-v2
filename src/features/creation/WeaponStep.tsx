import { PickPerGroupStep } from "./PickStep";
import type { Group } from "../../ui/step/Choices";
import type { Choice } from "./model";
import type { Step } from "../../rules/5e/steps";

/**
 * Which weapon, when the equipment line only named a category.
 *
 * 18 of the 89 equipment options across the thirteen classes say "any simple
 * weapon" rather than naming one, and a fighter used to walk away carrying
 * the words. One question per category, filtered to what the phrase asked
 * for — a "martial melee weapon" pool is 250 rows, not all 555.
 */
export function WeaponStep({
  step, groups, onChoose, ...common
}: {
  step: Step;
  groups: readonly Group[];
  onChoose: (c: Choice) => void;
  index: number; total: number;
  stepKey?: string | undefined;
  direction?: "forward" | "back" | undefined;
  onBack?: () => void;
  arrived?: string;
}) {
  return (
    <PickPerGroupStep
      {...common}
      title={step.title} question={step.question} sub={step.sub}
      groups={groups} countLabel="Weapons chosen"
      onContinue={(picked) => {
        /* Kept apart from the lines: the line said "a martial weapon and a
           shield", and the shield was never in question. */
        const chosen = groups.flatMap((g) => (picked[g.id] ?? []).map(
          (id) => g.options.find((o) => o.id === id)?.name ?? id));
        onChoose({ step: "weapons", weapons: chosen });
      }}
    />
  );
}
