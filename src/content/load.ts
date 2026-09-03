import { mergeById, type Thinner } from "./merge";
import type { Entry } from "./schema";
import { contentUrl } from "./base";

/**
 * Three layers, in order: SRD, the bundled compendium, then whatever this
 * device imported.
 *
 * **Absent is normal.** A deployment built without running the compendium
 * build has no bundled layer at all, and every screen still works on the SRD.
 * That is a supported configuration — and the only redistributable one — so a
 * missing file resolves to an empty list rather than an error.
 */
export type Fetcher = (url: string) => Promise<Response>;

export async function loadLayer<T extends Entry>(url: string, fetcher: Fetcher = fetch): Promise<T[]> {
  try {
    const res = await fetcher(url);
    if (!res.ok) return [];
    const json: unknown = await res.json();
    return Array.isArray(json) ? (json as T[]) : [];
  } catch {
    // A phone in a basement is offline, not broken.
    return [];
  }
}

/** A chunk that is a map rather than a list — paths are keyed by class. */
export async function loadMap<T>(url: string, fetcher: Fetcher = fetch): Promise<Record<string, T>> {
  try {
    const res = await fetcher(url);
    if (!res.ok) return {};
    const json: unknown = await res.json();
    return typeof json === "object" && json !== null && !Array.isArray(json) ? (json as Record<string, T>) : {};
  } catch {
    return {};
  }
}

/** A chunk that is a plain list, carrying no provenance — the tool names. */
export async function loadList<T>(url: string, fetcher: Fetcher = fetch): Promise<T[]> {
  try {
    const res = await fetcher(url);
    if (!res.ok) return [];
    const json: unknown = await res.json();
    return Array.isArray(json) ? (json as T[]) : [];
  } catch {
    return [];
  }
}

export async function loadKind<T extends Entry>(
  kind: string,
  imported: readonly Thinner<T>[] = [],
  fetcher: Fetcher = fetch,
): Promise<T[]> {
  const srd = await loadLayer<T>(`/srd/${kind}.json`, fetcher);
  const bundled = await loadLayer<T>(contentUrl(`index/${kind}.json`), fetcher);
  return mergeById(mergeById(srd, bundled), imported);
}
