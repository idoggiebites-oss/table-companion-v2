import { useRef, type PointerEvent } from "react";

/**
 * Press and hold, as an accelerator — never as the only way in.
 *
 * A long press has no affordance: nothing on screen says it is there, and it
 * is unreachable without a touchscreen. So it sits on top of a visible
 * control ("What does this give you?") rather than instead of one.
 *
 * Three things it has to get right on a phone, and each is a real defect if
 * missed:
 *
 *   - **Movement cancels it.** A finger that has started scrolling is not
 *     pressing, and firing mid-scroll makes a list feel possessed.
 *   - **The click that follows is suppressed** — and not only on this element.
 *     A long press ends in a pointerup, which the browser turns into a click,
 *     so holding a row to read about it would also select it. Worse, the
 *     click does not always land where the press began: iOS can lift the art
 *     into a native drag, and once it does it stops delivering pointermove,
 *     so the finger slides to a NEIGHBOUR unseen and chooses that instead.
 *     Holding Elf selected Gnome. Per-element state cannot catch that, so a
 *     fired press swallows the next click wherever it lands.
 *   - **The callout menu is off.** iOS shows copy/define on a long press
 *     unless `-webkit-touch-callout` says otherwise; that is in the CSS.
 */
export function useLongPress(onLong: () => void, ms = 450) {
  const timer = useRef<number | null>(null);
  const from = useRef<{ x: number; y: number } | null>(null);
  const fired = useRef(false);

  /*
   * The document the pressed element actually lives in — NOT the ambient one.
   * A component can be rendered into another document (the test harness mounts
   * the phone in an iframe), and a guard attached to the wrong document is a
   * guard that silently does nothing.
   */
  const doc = useRef<Document | null>(null);

  /*
   * One shot, in the capture phase. It expires on its own so a press that
   * happens to be followed by no click at all cannot leave a trap set for the
   * next real one.
   */
  const swallowNextClick = () => {
    const on = doc.current ?? document;
    const eat = (e: Event) => {
      e.preventDefault();
      e.stopPropagation();
      done();
    };
    const done = () => {
      on.removeEventListener("click", eat, true);
      window.clearTimeout(expiry);
    };
    const expiry = window.setTimeout(done, 500);
    on.addEventListener("click", eat, true);
  };

  const stop = () => {
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = null;
    from.current = null;
  };

  return {
    onPointerDown: (e: PointerEvent) => {
      fired.current = false;
      doc.current = (e.currentTarget as Element).ownerDocument;
      from.current = { x: e.clientX, y: e.clientY };
      timer.current = window.setTimeout(() => {
        fired.current = true;
        swallowNextClick();
        onLong();
      }, ms);
    },
    onPointerMove: (e: PointerEvent) => {
      const start = from.current;
      // Ten pixels of slop: a still finger is never perfectly still.
      if (start === null) return;
      if (Math.abs(e.clientX - start.x) > 10 || Math.abs(e.clientY - start.y) > 10) stop();
    },
    onPointerUp: stop,
    onPointerCancel: stop,
    onPointerLeave: stop,
    /** Swallows the click a completed press would otherwise turn into. */
    onClickCapture: (e: { preventDefault: () => void; stopPropagation: () => void }) => {
      if (!fired.current) return;
      fired.current = false;
      e.preventDefault();
      e.stopPropagation();
    },
  };
}
