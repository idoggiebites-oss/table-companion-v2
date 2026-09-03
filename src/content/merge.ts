/**
 * Three layers, one merge: SRD, then the bundled compendium, then whatever
 * this device imported. Base first, field by field.
 *
 * A field absent in the newer row never overwrites a present one, so a thinner
 * file cannot delete what a richer one knew.
 */
/**
 * A layer that may carry fewer fields — or carry them explicitly empty, which
 * a JSON import routinely does. `Partial<T>` is not enough under
 * `exactOptionalPropertyTypes`: the thin file really does send `undefined`.
 */
export type Thinner<T> = { id: string } & { [K in keyof T]?: T[K] | undefined };

export function mergeById<T extends { id: string }>(
  base: readonly T[],
  /** The overlay is legitimately thinner — that is the whole point of the rule. */
  over: readonly Thinner<T>[],
): T[] {
  const out = new Map<string, T>();
  for (const row of base) out.set(row.id, row);
  for (const row of over) {
    const prev = out.get(row.id);
    if (prev === undefined) { out.set(row.id, row as T); continue; }
    const merged: Record<string, unknown> = { ...prev };
    for (const [k, v] of Object.entries(row)) {
      if (v === undefined || v === null) continue;
      if (typeof v === "string" && v === "") continue;
      if (Array.isArray(v) && v.length === 0) continue;
      merged[k] = v;
    }
    out.set(row.id, merged as T);
  }
  return [...out.values()];
}
