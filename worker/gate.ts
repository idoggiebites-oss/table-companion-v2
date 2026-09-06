/**
 * Keeping the table private.
 *
 * The deployment lives on a workers.dev subdomain, which is Cloudflare's zone
 * rather than ours — so Cloudflare Access, which needs a hostname you own,
 * is not available without moving to a custom domain. This is the same job
 * done in the Worker: one shared passphrase, held as a secret, exchanged once
 * per device for a long-lived cookie.
 *
 * It is a shared secret, not identity. It stops crawlers, strangers and
 * anyone who guesses the address; it does not distinguish one player from
 * another, and it is not what keeps the DM's monsters hidden — that is the
 * disclosure ladder, and it works on the seat rather than on the door.
 *
 * FAILS OPEN when no passphrase is configured. A half-deployed gate that
 * locks the table out of its own campaign mid-session is worse than an open
 * one, and the absence of a secret is unambiguous.
 *
 * Ported from V1's worker/gate.ts. It does not protect the compendium — the
 * compendium is public on GitHub Pages by design and is not served by this
 * Worker at all. What sits behind this gate is the app and the room.
 *
 * One deliberate difference from V1: V1 special-cases `/api/` so a request
 * that expected JSON gets a bare status instead of an HTML login page. V2 has
 * no `/api/` prefix — the room lives at `/room/:code` and only ever answers
 * with a WebSocket upgrade or a plain-text status, never HTML — so the same
 * reasoning is applied to `/room/` below instead of `/api/`.
 */

const COOKIE = "tc_pass";
/** Long, because the alternative is a player retyping it at every session. */
const MAX_AGE = 60 * 60 * 24 * 365;

/**
 * The cookie holds a hash, never the passphrase. Salted with a constant so
 * the value is useless anywhere else, and so changing the salt invalidates
 * every device at once if it ever needs to.
 */
export async function tokenFor(passphrase: string): Promise<string> {
  const bytes = new TextEncoder().encode(`table-companion:v1:${passphrase}`);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Length-independent compare, so the answer leaks nothing by timing. */
function sameToken(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function cookieValue(header: string | null, name: string): string | null {
  for (const part of (header ?? "").split(";")) {
    const [k, ...rest] = part.trim().split("=");
    if (k === name) return rest.join("=");
  }
  return null;
}

/*
 * The door, and what is behind it.
 *
 * Built to Arturo's concept: a parchment ground, an ornate frame, and the
 * lit archway as the one image on the page. The art is real artwork rather
 * than CSS — `public/gate/` holds the door, the crest, the wordmark and a
 * divider rule, cut from the supplied sheet.
 *
 * **Committed to one look, deliberately.** Everything else in this app is
 * theme-aware; this page is not. It is a printed page rather than a screen —
 * a lit door on parchment — and a dark inversion of it would be a different
 * illustration, not the same one at night. So every colour here is painted
 * explicitly and none of it is a token.
 *
 * The art is fetched by a page nobody has authenticated for, which is why
 * `guard` lets `/gate/` through unauthenticated. Four decorative images, no
 * data, on a page that is already public.
 *
 * It stays ONE request otherwise: the CSS is inline because a stylesheet is a
 * second round trip in front of a person who is just trying to get in, and
 * because the service worker must never cache this page as the app shell.
 */
const PAGE = (error: boolean) => `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Adventurer&#39;s Forge</title>
<link rel="preload" as="image" href="/gate/door.webp">
<style>
  :root { color-scheme: light; }
  * { box-sizing: border-box; }

  body {
    margin: 0; min-height: 100dvh; padding: clamp(14px, 4vw, 28px);
    display: grid; place-items: center;
    background: #EFE6D6;
    color: #4A3B24;
    font: 16px/1.5 "Iowan Old Style", "Palatino Linotype", Palatino, Georgia, serif;
    -webkit-font-smoothing: antialiased;
  }

  /* The parchment sheet, with the concept's double rule and corner marks. */
  .sheet {
    position: relative; width: min(430px, 100%);
    display: flex; flex-direction: column; align-items: center;
    gap: clamp(12px, 3vw, 20px);
    padding: clamp(22px, 6vw, 34px) clamp(18px, 5vw, 28px);
    background:
      radial-gradient(120% 80% at 50% 0%, #FDF8EE 0%, #F7EEDC 55%, #F1E6D2 100%);
    border: 1px solid #C9A961;
    border-radius: 14px;
    box-shadow: 0 1px 0 #FFFBF3 inset, 0 18px 44px rgba(74, 59, 36, .18);
  }
  /* The inner hairline. A second border rather than an outline so the corner
     marks can sit across it. */
  .sheet::before {
    content: ""; position: absolute; inset: 7px;
    border: 1px solid rgba(201, 169, 97, .5); border-radius: 9px;
    pointer-events: none;
  }
  /*
   * The corner flourish, drawn rather than cut from the sheet.
   *
   * The concept's corners are ornament on parchment, and lifting them out of
   * a flat illustration means keying gold off a background that is nearly the
   * same value. Inline SVG instead: one shape, no extra request, crisp at any
   * size, and it takes its colour from here rather than carrying its own.
   */
  .corner {
    position: absolute; width: 34px; height: 34px; opacity: .9;
    pointer-events: none; background: #C9A961;
    -webkit-mask: var(--corner) center / contain no-repeat;
            mask: var(--corner) center / contain no-repeat;
    --corner: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 34 34' fill='none' stroke='%23000' stroke-width='1.4' stroke-linecap='round'%3E%3Cpath d='M2 12V4a2 2 0 0 1 2-2h8'/%3E%3Cpath d='M6 16v-8a2 2 0 0 1 2-2h8' opacity='.55'/%3E%3Cpath d='M2 20c5 0 7-3 7-7'/%3E%3Cpath d='M20 2c0 5-3 7-7 7'/%3E%3Cpath d='M11 11l2.2 2.2M11 11l-2.2-2.2'/%3E%3Ccircle cx='11' cy='11' r='1.6' fill='%23000' stroke='none'/%3E%3C/svg%3E");
  }
  .tl { top: 11px; left: 11px; }
  .tr { top: 11px; right: 11px; transform: scaleX(-1); }
  .bl { bottom: 11px; left: 11px; transform: scaleY(-1); }
  .br { bottom: 11px; right: 11px; transform: scale(-1); }

  .crest { width: clamp(52px, 14vw, 66px); height: auto; display: block; }
  .wordmark { width: min(258px, 76%); height: auto; display: block; }

  /* The one image on the page, and the reason it exists. Sized to leave the
     field and the button above the fold on a small phone. */
  .door {
    width: min(300px, 88%); height: auto; display: block;
    margin: clamp(-2px, 1vw, 6px) 0;
  }

  form { width: 100%; display: flex; flex-direction: column; align-items: center; gap: 12px; }

  /* "PASSKEY", as a caption on a rule — the concept's own device. */
  .legend {
    display: flex; align-items: center; gap: 10px; width: 100%;
    font-family: ui-sans-serif, -apple-system, system-ui, sans-serif;
    font-size: .66rem; letter-spacing: .22em; text-transform: uppercase;
    color: #9A7B3F;
  }
  .legend::before, .legend::after {
    content: ""; height: 1px; flex: 1; background: rgba(201, 169, 97, .55);
  }

  .field { position: relative; width: 100%; }
  /* The key, drawn rather than fetched: one more request for 14 pixels of
     decoration is not worth it in front of somebody trying to get in. */
  .field::before {
    content: ""; position: absolute; left: 14px; top: 50%; width: 17px; height: 17px;
    margin-top: -8.5px; pointer-events: none; opacity: .75;
    background: #A9853F;
    -webkit-mask: var(--key) center / contain no-repeat;
            mask: var(--key) center / contain no-repeat;
    --key: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20' fill='none' stroke='%23000' stroke-width='1.5' stroke-linecap='round'%3E%3Ccircle cx='6.5' cy='6.5' r='3.5'/%3E%3Cpath d='M9 9l8 8M14 14l2-2M12 12l2-2'/%3E%3C/svg%3E");
  }

  input {
    width: 100%; min-height: 50px; padding: 0 14px 0 40px;
    font: inherit; font-size: 1rem; color: #3D3018;
    background: #FBF5E9;
    border: 1px solid #CDAF74; border-radius: 8px;
  }
  input::placeholder { color: #A5906A; }
  input:focus-visible { outline: 2px solid #B18937; outline-offset: 1px; }

  button {
    width: 100%; min-height: 52px; padding: 0 18px;
    font: inherit; font-size: .95rem; letter-spacing: .18em; text-transform: uppercase;
    color: #3A2C12; cursor: pointer;
    background: linear-gradient(180deg, #D9B466 0%, #C29A45 55%, #B0862F 100%);
    border: 1px solid #9A7529; border-radius: 8px;
    box-shadow: 0 1px 0 rgba(255, 248, 230, .45) inset;
  }
  button:hover { filter: brightness(1.04); }
  button:active { filter: brightness(.97); }
  button:focus-visible { outline: 2px solid #6B4E12; outline-offset: 2px; }

  .rule { width: min(190px, 60%); height: auto; display: block; opacity: .9; }

  .note {
    margin: 0; text-align: center; min-height: 1.4em;
    font-family: ui-sans-serif, -apple-system, system-ui, sans-serif;
    font-size: .8rem; color: #8A7145;
  }
  /* Refused, and it says so where the eye already is. */
  .err { color: #A3402F; }

  @media (prefers-reduced-motion: no-preference) {
    .sheet { animation: rise .5s cubic-bezier(.22,.61,.36,1) both; }
    @keyframes rise { from { opacity: 0; transform: translateY(8px); } }
  }
</style></head><body>
<main class="sheet">
  <span class="corner tl"></span><span class="corner tr"></span>
  <span class="corner bl"></span><span class="corner br"></span>

  <img class="crest" src="/gate/crest.webp" alt="" width="180" height="193">
  <img class="wordmark" src="/gate/wordmark.webp" width="494" height="182"
       alt="Adventurer&#39;s Forge — a D&amp;D companion">
  <img class="door" src="/gate/door.webp" alt="" width="632" height="668">

  <form method="POST" action="/unlock">
    <span class="legend">Passkey</span>
    <span class="field">
      <input type="password" name="passphrase" aria-label="Passkey"
             placeholder="Enter passkey" autocomplete="current-password" autofocus required>
    </span>
    <button type="submit">Enter</button>
    <p class="note">${error ? '<span class="err">That is not it.</span>' : "This table is private."}</p>
  </form>

  <img class="rule" src="/gate/rule.webp" alt="" width="507" height="105">
</main>
</body></html>`;

export interface GateResult {
  /** When set, return this instead of handling the request. */
  readonly response?: Response;
}

/**
 * Returns a response when the request should be stopped, and nothing when it
 * should continue.
 */
export async function guard(request: Request, passphrase: string | undefined): Promise<GateResult> {
  if (!passphrase) return {};

  const url = new URL(request.url);
  const expected = await tokenFor(passphrase);

  if (url.pathname === "/unlock" && request.method === "POST") {
    const form = await request.formData();
    const given = String(form.get("passphrase") ?? "");
    if ((await tokenFor(given)) !== expected) {
      return { response: new Response(PAGE(true), { status: 401, headers: html() }) };
    }
    return {
      response: new Response(null, {
        status: 303,
        headers: {
          location: "/",
          "set-cookie":
            `${COOKIE}=${expected}; Path=/; Max-Age=${MAX_AGE}; HttpOnly; Secure; SameSite=Lax`,
        },
      }),
    };
  }

  const held = cookieValue(request.headers.get("cookie"), COOKIE);
  if (held && sameToken(held, expected)) return {};

  /*
   * The gate's own artwork, served to a page nobody has authenticated for.
   *
   * `public/gate/` is four decorative images and no data, on a login page that
   * is already public — and without this the gate answers its own <img> tags
   * with the login page's HTML, so the door it exists to draw never loads.
   *
   * Scoped to that one directory on purpose. It is the only hole in the gate,
   * and it must stay the size of a picture.
   */
  if (url.pathname.startsWith("/gate/")) return {};

  /*
   * The service worker, and the two files it needs to exist.
   *
   * This one is not a convenience — without it the gate can strand a browser
   * on an OLD build forever, and it did. V1 shipped a service worker at this
   * same origin and scope. A worker's precached shell answers navigations from
   * cache without consulting the network, so that browser never reaches the
   * gate, never gets a cookie, and therefore cannot fetch `/sw.js` to learn
   * that a newer worker exists — the update it needs is behind the door it
   * cannot open. Arturo hit exactly this: "when I open the link on one of my
   * browsers it still opens V1 even with the current link."
   *
   * Letting these through breaks the deadlock: the browser fetches the new
   * worker, which calls `skipWaiting` and `clientsClaim`, takes over, and the
   * next navigation reaches the gate properly.
   *
   * What it costs is the list of filenames the app precaches. No campaign
   * data, no compendium, no room — those are all still behind the cookie, and
   * an unauthenticated install simply fails when its precache fetches 401.
   * The same trade as the artwork above, and for a better reason.
   */
  if (SERVICE_WORKER.test(url.pathname)) return {};

  // A room request gets a status, not a login page: it is a WebSocket
  // upgrade (or, off that path, a plain-text error from Room.ts itself), and
  // neither one ever reads an HTML body — see the file header for why this
  // takes the place of V1's `/api/` special-case.
  if (url.pathname.startsWith("/room/")) {
    return { response: new Response("locked", { status: 401 }) };
  }
  return { response: new Response(PAGE(false), { status: 401, headers: html() }) };
}

/** `sw.js`, its Workbox chunk, the registration shim and the push handlers. */
const SERVICE_WORKER = /^\/(sw|registerSW|push-sw|workbox-[a-z0-9]+)\.js$/;

const html = () => ({
  "content-type": "text/html; charset=utf-8",
  // Never cached: the service worker must not keep a login page as the shell.
  "cache-control": "no-store",
});
