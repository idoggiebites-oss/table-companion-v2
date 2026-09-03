import { useEffect, useState } from "react";
import { pushKey, pushState, subscribe, unsubscribe, type PushState } from "./push";
import s from "./PushToggle.module.css";

/**
 * One button, saying exactly what it will do.
 *
 * Asking for notification permission is a real operating-system prompt that
 * cannot be un-asked, so this is deliberately not near anything a thumb might
 * hit by accident, and it never asks on its own.
 *
 * Every reason it cannot be offered is a SENTENCE rather than a disabled
 * control: "not supported here" and "you said no once" and "this deployment
 * has no keys" are different situations, and a greyed-out button says none of
 * them.
 */
export function PushToggle({ characters, onSubscribe, onUnsubscribe }: {
  /** Who this device is answering for — usually one, sometimes two. */
  characters: readonly string[];
  onSubscribe: (sub: { endpoint: string; p256dh: string; auth: string }) => void;
  onUnsubscribe: (endpoint: string) => void;
}) {
  const [key, setKey] = useState<string | null>(null);
  const [state, setState] = useState<PushState | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let live = true;
    void (async () => {
      const k = await pushKey();
      if (!live) return;
      setKey(k);
      setState(await pushState(k));
    })();
    return () => { live = false; };
  }, []);

  /* Nothing at all until we know: a control that appears and then vanishes is
     worse than one that arrives a beat late. */
  if (state === null) return null;

  /* The feature is off for this deployment. Say nothing rather than offer a
     button that cannot work — this is not the player's problem to solve. */
  if (state === "unconfigured" || state === "unsupported") return null;

  if (state === "needs-install") {
    return (
      <p className={s.note} data-testid="push-note">
        Add this to your home screen and notifications become available. Apple’s rule, not ours.
      </p>
    );
  }

  if (state === "blocked") {
    return (
      <p className={s.note} data-testid="push-note">
        Notifications are blocked for this site. Your browser’s settings can undo that.
      </p>
    );
  }

  const on = state === "on";
  return (
    <button
      type="button"
      className={s.toggle}
      data-testid="push-toggle"
      aria-pressed={on}
      disabled={busy}
      onClick={() => {
        setBusy(true);
        void (async () => {
          try {
            if (on) {
              const endpoint = await unsubscribe();
              if (endpoint !== null) onUnsubscribe(endpoint);
            } else if (key !== null) {
              const sub = await subscribe(key);
              /* Saying no is an ANSWER, not a failure. The button comes back
                 rather than an error appearing. */
              if (sub !== null) onSubscribe(sub);
            }
            setState(await pushState(key));
          } finally {
            setBusy(false);
          }
        })();
      }}
    >
      {on ? "Buzz this phone: on" : "Buzz this phone when it is my turn"}
    </button>
  );
}
