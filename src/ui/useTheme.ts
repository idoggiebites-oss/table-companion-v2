import { useCallback, useEffect, useState } from "react";

/**
 * Which of the two themes this device is showing, and how to swap it.
 *
 * Device-local by definition: a theme is a fact about a phone, not about the
 * campaign, so it never becomes an Event and never reaches another device
 * (ARCHITECTURE.md). `localStorage` rather than the log, for the same reason
 * the device id lives there.
 *
 * THREE states, not two. "system" is the default and is the absence of a
 * `data-theme` attribute, which is exactly what tokens.css is written for: a
 * bare `:root` for light, a `prefers-color-scheme: dark` block guarded by
 * `:not([data-theme="light"])`, and a `[data-theme="dark"]` block so an
 * explicit choice wins in both directions.
 *
 * Getting this wrong is invisible until somebody holds the phone. The state
 * began as a hardcoded `"light"` while the stylesheet followed the system, so
 * on a phone in dark mode the app rendered DARK and the toggle believed it was
 * light — the first press set `data-theme="dark"`, which was already what the
 * screen showed, and the button appeared to do nothing at all.
 */
export type Theme = "light" | "dark" | "system";

const KEY = "theme";

const stored = (): Theme => {
  try {
    const v = localStorage.getItem(KEY);
    return v === "light" || v === "dark" ? v : "system";
  } catch {
    /* Private mode, or storage denied. A theme is not worth failing over. */
    return "system";
  }
};

const systemDark = () =>
  typeof matchMedia === "function" && matchMedia("(prefers-color-scheme: dark)").matches;

export function useTheme(): {
  /** What the screen is actually showing, which is what a label must name. */
  readonly showing: "light" | "dark";
  readonly choice: Theme;
  /** Swap to the opposite of what is on screen, and remember it. */
  readonly flip: () => void;
} {
  const [choice, setChoice] = useState<Theme>(stored);
  const [dark, setDark] = useState(systemDark);

  /* Follow the system while nothing has been chosen, so the label stays true
     when the phone turns itself dark at sunset. */
  useEffect(() => {
    if (typeof matchMedia !== "function") return;
    const q = matchMedia("(prefers-color-scheme: dark)");
    const on = () => setDark(q.matches);
    q.addEventListener("change", on);
    return () => q.removeEventListener("change", on);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    if (choice === "system") root.removeAttribute("data-theme");
    else root.setAttribute("data-theme", choice);
  }, [choice]);

  const showing = choice === "system" ? (dark ? "dark" : "light") : choice;

  const flip = useCallback(() => {
    const next = showing === "light" ? "dark" : "light";
    setChoice(next);
    try { localStorage.setItem(KEY, next); } catch { /* see `stored` */ }
  }, [showing]);

  return { showing, choice, flip };
}
