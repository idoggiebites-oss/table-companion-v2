/**
 * What an ancestry left open, once the player has closed it.
 *
 * Its own module because `EMPTY` needs the constant and `model.ts` imports it.
 * Living in `scores.ts` put it inside a cycle — `model` → `scores` → `model`,
 * for `primary` — and which half won depended on which file the program
 * entered through. Reached via `compendium.ts`, `NO_HERITAGE` was still
 * undefined when `EMPTY` was built, so `EMPTY.heritage` was silently
 * `undefined` and stayed that way. Nothing read it, so nothing complained.
 * This file imports nothing, so there is no order for it to lose.
 */
export type Heritage = {
  readonly abilities: Readonly<Record<string, number>>;
  readonly skills: readonly string[];
  readonly feat: string | null;
};

export const NO_HERITAGE: Heritage = { abilities: {}, skills: [], feat: null };
