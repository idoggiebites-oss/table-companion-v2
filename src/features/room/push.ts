/**
 * Getting a phone to buzz.
 *
 * It is OFF until asked for, and asking is a real prompt from the operating
 * system that cannot be un-asked. So there is one button, it says exactly what
 * will happen, and it is nowhere near anything a thumb might hit by accident.
 *
 * What it needs, in order: a service worker (the app has one), a VAPID public
 * key from this deployment (absent means the feature is off and the button
 * does not appear), permission, and a subscription. **Any of them missing is a
 * reason, not an error** — `pushState` says which, so the screen can explain
 * rather than fail.
 *
 * Ported from V1's `store/push.ts`.
 */

export type PushState =
  | "unsupported"
  /** An iPhone that has not installed the app. Apple's rule, not ours. */
  | "needs-install"
  /** This deployment has no keys, so nothing can be sent. */
  | "unconfigured"
  | "blocked"
  | "off"
  | "on";

export type Subscription = {
  readonly endpoint: string;
  readonly p256dh: string;
  readonly auth: string;
};

const b64url = (b: ArrayBuffer | null): string => {
  if (b === null) return "";
  let s = "";
  for (const byte of new Uint8Array(b)) s += String.fromCharCode(byte);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};

/** The base64url key the Push API wants as bytes. */
const keyBytes = (s: string): Uint8Array => {
  const pad = s.replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(pad + "=".repeat((4 - (pad.length % 4)) % 4));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
};

const supported = (): boolean =>
  typeof navigator !== "undefined" && "serviceWorker" in navigator && "PushManager" in window;

/**
 * Safari only allows this from an installed app, and says nothing useful when
 * it refuses. Detected rather than caught, so the screen can say "add it to
 * your home screen first" instead of "something went wrong".
 */
const needsInstall = (): boolean => {
  const standalone = window.matchMedia("(display-mode: standalone)").matches
    || (navigator as { standalone?: boolean }).standalone === true;
  const apple = /iPad|iPhone|iPod/.test(navigator.userAgent);
  return apple && !standalone;
};

/** The public key this deployment signs with, or null when push is off. */
export async function pushKey(fetcher: typeof fetch = fetch): Promise<string | null> {
  try {
    const res = await fetcher("/push/key");
    if (!res.ok) return null;
    const key = (await res.text()).trim();
    return key === "" ? null : key;
  } catch {
    return null;
  }
}

/** Where this device stands, and why. */
export async function pushState(key: string | null): Promise<PushState> {
  if (!supported()) return needsInstall() ? "needs-install" : "unsupported";
  if (key === null) return "unconfigured";
  if (Notification.permission === "denied") return "blocked";
  const reg = await navigator.serviceWorker.ready;
  const existing = await reg.pushManager.getSubscription();
  return existing === null ? "off" : "on";
}

/**
 * Ask, and subscribe if the answer is yes.
 *
 * Returns null when the person said no, which is an answer rather than a
 * failure — the caller shows the button again rather than an error.
 */
export async function subscribe(key: string): Promise<Subscription | null> {
  const permission = await Notification.requestPermission();
  if (permission !== "granted") return null;
  const reg = await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.subscribe({
    /* Every browser enforces this, and it is the right rule: a push that shows
       nothing is how tracking works. */
    userVisibleOnly: true,
    applicationServerKey: keyBytes(key) as BufferSource,
  });
  return read(sub);
}

/** Stop. Returns the endpoint that was dropped, so the room can forget it. */
export async function unsubscribe(): Promise<string | null> {
  const reg = await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.getSubscription();
  if (sub === null) return null;
  const endpoint = sub.endpoint;
  await sub.unsubscribe();
  return endpoint;
}

/** The subscription in the shape the worker stores. */
export function read(sub: PushSubscription): Subscription {
  return {
    endpoint: sub.endpoint,
    p256dh: b64url(sub.getKey("p256dh")),
    auth: b64url(sub.getKey("auth")),
  };
}
