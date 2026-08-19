import type { Adapter, AdapterHandlers } from "../core/types";
import type { Site } from "../sites";
import { QUIESCENCE_MS } from "./shared";

/**
 * The generic adapter: any chat site we have not measured live.
 *
 * It cannot know a site's streaming attribute or message markup, so it works
 * from the one thing every streaming UI shares: some element's text grows,
 * repeatedly, in one place. The rules that make that safe on an unknown DOM:
 *
 *  - A stream must PROVE itself before anything sounds: the same element has
 *    to grow three times within two seconds, never shrinking in between.
 *    Real streams clear that bar in under a second (measured 4.8-6.6
 *    growths/sec); the things that must stay silent structurally cannot —
 *    one-shot changes (the user's own message, toasts, tooltips) grow once,
 *    relative timestamps grow once a minute, and animated "..." loaders
 *    shrink every cycle, which resets the proof.
 *  - Ignore anything inside the composer (contenteditable, inputs), controls,
 *    and navigation. Typing must never play.
 *  - Prefer a message-shaped ancestor as the growth target so the whole reply
 *    is measured, not one paragraph of it.
 *  - End of stream is quiescence; there is no site signal to trust.
 *
 * Degraded by design: no fast end signal, and on a DOM with no message-shaped
 * ancestors it may attribute growth loosely. The tuned adapters stay the
 * reference; a site that earns it gets promoted to its own file.
 */

/** Never sources of Chunks: the user's own typing, controls, navigation. */
const IGNORE =
  '[contenteditable], textarea, input, select, button, [role="button"],' +
  '[role="menu"], [role="toolbar"], [role="textbox"], nav, aside, header, footer';

/** Message-shaped ancestors, nearest first via closest(). */
const BLOCK =
  '[class*="message"], [class*="response"], [class*="assistant"],' +
  '[class*="markdown"], [class*="prose"], [data-message-id], article, li';

/** Growth events required, and the window they must land in, to confirm a stream. */
const CONFIRM_EVENTS = 3;
const CONFIRM_WINDOW_S = 2;

export function makeGenericAdapter(site: Site): Adapter {
  return {
    id: site.id,

    matches: (url) => {
      const { hostname } = new URL(url);
      return hostname === site.host || hostname.endsWith(`.${site.host}`);
    },

    start(handlers: AdapterHandlers, now) {
      const root = document.querySelector("main") ?? document.body;

      let target: Element | null = null;
      let lastLength = 0;
      let confirmed = false;
      let pending: number[] = [];
      let endTimer: ReturnType<typeof setTimeout> | undefined;

      const reset = (): void => {
        if (confirmed) {
          try {
            handlers.onStreamEnd("quiescence");
          } catch {
            /* never throw into the host page */
          }
        }
        target = null;
        confirmed = false;
        pending = [];
      };

      const armQuiescence = (): void => {
        clearTimeout(endTimer);
        endTimer = setTimeout(reset, QUIESCENCE_MS);
      };

      const observer = new MutationObserver((records) => {
        try {
          let grewIn: Element | null = null;
          for (const record of records) {
            const el =
              record.target.nodeType === Node.ELEMENT_NODE
                ? (record.target as Element)
                : record.target.parentElement;
            if (!el || el.closest(IGNORE)) continue;
            grewIn = el;
          }
          if (!grewIn) return;

          if (target && !target.contains(grewIn)) {
            // Growth somewhere else. Before the target has proved itself it
            // was a guess, so re-adopt; after that, stay locked — the current
            // stream ends by quiescence first, then the next one is adopted.
            if (confirmed) return;
            target = null;
          }

          if (!target) {
            target = grewIn.closest(BLOCK) ?? root;
            // Adopt at the current length without emitting: this swallows the
            // arrival burst, which is how one-shot changes stay silent.
            lastLength = (target.textContent ?? "").length;
            pending = [];
            armQuiescence();
            return;
          }

          const text = target.textContent ?? "";
          const delta = text.length - lastLength;
          if (delta < 0 && !confirmed) {
            // Streams never shrink. An unconfirmed target that does is churn
            // (an animated "..." loader, a re-rendering widget): start over.
            lastLength = text.length;
            pending = [];
            return;
          }
          if (delta <= 0) return;

          const added = text.slice(lastLength);
          lastLength = text.length;

          if (!confirmed) {
            const at = now();
            pending = pending.filter((t) => at - t < CONFIRM_WINDOW_S);
            pending.push(at);
            if (pending.length < CONFIRM_EVENTS) {
              // Not yet proven: swallow this growth. Costs under a second of
              // a real stream's intro; buys silence from everything else.
              armQuiescence();
              return;
            }
            confirmed = true;
          }

          handlers.onChunk({
            text: added,
            chars: delta,
            isCode: grewIn.closest("pre, code") !== null,
            endsSentence: /[.!?]["')\s]*$/.test(added),
            at: now(),
          });
          armQuiescence();
        } catch {
          /* a site redesign must degrade to silence, never an exception */
        }
      });

      observer.observe(root, {
        childList: true,
        subtree: true,
        characterData: true,
      });

      return () => {
        observer.disconnect();
        clearTimeout(endTimer);
      };
    },
  };
}
