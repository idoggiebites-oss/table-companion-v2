import type { ReactNode } from "react";
import { createRoot } from "react-dom/client";

/* The reference phone. 390 x 844.

   This mounts into an IFRAME rather than sizing the window, because headless
   Chrome asked for a 390px window lays out at 500 and crops — a screen that
   overflows then measures as fitting. An iframe gets its own viewport, so
   media queries and dvh are honest. */
export const PHONE = { width: 390, height: 844 } as const;

export type Phone = {
  doc: Document;
  frame: HTMLIFrameElement;
  /** Content height as a multiple of one viewport. See DESIGN.md. */
  screens(): number;
  /** Every interactive box smaller than 44px in either axis. */
  smallTargets(): string[];
  destroy(): void;
};

export async function mountPhone(ui: ReactNode, theme: "light" | "dark" = "light"): Promise<Phone> {
  const frame = document.createElement("iframe");
  frame.width = String(PHONE.width);
  frame.height = String(PHONE.height);
  frame.style.border = "0";
  document.body.appendChild(frame);

  const doc = frame.contentDocument!;
  doc.documentElement.setAttribute("data-theme", theme);
  // Motion is a token precisely so a test can set it to zero.
  doc.documentElement.setAttribute("data-motion", "off");
  for (const node of document.querySelectorAll('style, link[rel="stylesheet"]')) {
    doc.head.appendChild(node.cloneNode(true));
  }

  const root = createRoot(doc.body);
  root.render(ui);
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));

  return {
    doc,
    frame,
    screens() {
      const scroller = doc.querySelector('[data-testid="scroll"]');
      if (!scroller) return doc.documentElement.scrollHeight / PHONE.height;
      const shell = scroller.parentElement!;
      let total = 0;
      for (const child of shell.children) {
        total += child === scroller ? scroller.scrollHeight : (child as HTMLElement).offsetHeight;
      }
      return total / PHONE.height;
    },
    smallTargets() {
      const sel = 'button, a[href], input, select, textarea, [role="button"], [role="tab"], [role="checkbox"]';
      const bad: string[] = [];
      for (const el of doc.querySelectorAll(sel)) {
        const r = el.getBoundingClientRect();
        if (r.width === 0 && r.height === 0) continue;
        if (r.height < 44 || r.width < 44) {
          bad.push(`<${el.tagName.toLowerCase()}> "${(el.textContent ?? "").trim().slice(0, 24)}" is ${Math.round(r.width)}x${Math.round(r.height)}`);
        }
      }
      return bad;
    },
    destroy() {
      root.unmount();
      frame.remove();
    },
  };
}
