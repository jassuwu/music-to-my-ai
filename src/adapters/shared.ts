import type { AdapterHandlers, Chunk } from "../core/types";

/**
 * Shared observation logic for both sites, encoding what live measurement
 * showed:
 *
 *  - Watch characterData AND childList. The split is 174/63 on chatgpt.com but
 *    46/75 on claude.ai, so either channel alone loses half the stream on one
 *    of the two sites.
 *  - Emit ONE Chunk per callback with net growth, never per mutation record.
 *    claude.ai's median inter-record gap is 1ms; per-record firing is unplayable.
 *  - Measure growth from the assistant element's own length, which structurally
 *    excludes the composer — the skeleton's generic observer reported the user's
 *    own typing as 1-character Chunks.
 *  - End of stream is quiescence, with an optional site signal as a fast path.
 */
export const QUIESCENCE_MS = 900;

export interface ObserveOptions {
  /** Element to observe; scoped, never document.body (sidebar churn is noisy). */
  root: Element;
  /** Finds the assistant message currently being written, if any. */
  activeMessage: () => Element | null;
  /** Optional early end-of-stream signal, e.g. an attribute flip. */
  hasEnded?: (el: Element) => boolean;
}

export function observeStream(
  { root, activeMessage, hasEnded }: ObserveOptions,
  handlers: AdapterHandlers,
  now: () => number,
): () => void {
  let current: Element | null = null;
  let lastLength = 0;
  let endTimer: ReturnType<typeof setTimeout> | undefined;
  let streaming = false;

  const finish = (reason: "quiescence" | "signal") => {
    if (!streaming) return;
    streaming = false;
    current = null;
    clearTimeout(endTimer);
    try {
      handlers.onStreamEnd(reason);
    } catch {
      /* never throw into the host page */
    }
  };

  const observer = new MutationObserver((records) => {
    try {
      const active = activeMessage();
      if (!active) return;

      if (active !== current) {
        current = active;
        lastLength = 0;
        streaming = false;
      }

      const text = active.textContent ?? "";
      const delta = text.length - lastLength;
      if (delta <= 0) {
        if (streaming && hasEnded?.(active)) finish("signal");
        return;
      }

      const added = text.slice(lastLength);
      lastLength = text.length;

      let isCode = false;
      for (const r of records) {
        const el =
          r.target.nodeType === Node.ELEMENT_NODE
            ? (r.target as Element)
            : r.target.parentElement;
        if (el?.closest("pre, code")) {
          isCode = true;
          break;
        }
      }

      streaming = true;
      const chunk: Chunk = {
        text: added,
        chars: delta,
        isCode,
        endsSentence: /[.!?]["')\s]*$/.test(added),
        at: now(),
      };
      handlers.onChunk(chunk);

      clearTimeout(endTimer);
      endTimer = setTimeout(() => finish("quiescence"), QUIESCENCE_MS);
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
}
