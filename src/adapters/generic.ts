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
 *  - Adopt the growing block silently and only emit from the SECOND growth
 *    onward. A one-shot DOM change — the user's own message posting, a toast,
 *    a tooltip — grows once and never sounds.
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
      let emitted = false;
      let endTimer: ReturnType<typeof setTimeout> | undefined;

      const reset = (): void => {
        if (emitted) {
          try {
            handlers.onStreamEnd("quiescence");
          } catch {
            /* never throw into the host page */
          }
        }
        target = null;
        emitted = false;
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
            // Growth somewhere else. Before the target has ever sounded it was
            // a guess, so re-adopt; after that, stay locked — the current
            // stream ends by quiescence first, then the next one is adopted.
            if (emitted) return;
            target = null;
          }

          if (!target) {
            target = grewIn.closest(BLOCK) ?? root;
            // Adopt at the current length without emitting: this swallows the
            // arrival burst, which is how one-shot changes stay silent.
            lastLength = (target.textContent ?? "").length;
            armQuiescence();
            return;
          }

          const text = target.textContent ?? "";
          const delta = text.length - lastLength;
          if (delta <= 0) return;

          const added = text.slice(lastLength);
          lastLength = text.length;
          emitted = true;

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
