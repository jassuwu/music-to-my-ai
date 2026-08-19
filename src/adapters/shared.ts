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
 *  - Measure growth from the assistant message's own prose, which structurally
 *    excludes the composer.
 *  - End of stream is quiescence, with an optional site signal as a fast path.
 */
export const QUIESCENCE_MS = 900;

/**
 * The prose inside a message, if the site marks it out. Measuring the whole
 * message wrapper instead counts the action buttons ("Copy", "Retry") that
 * appear when a response finishes, and any tooltip that shows up on hover —
 * every one of which would otherwise fire a note.
 */
const CONTENT = '.markdown, .standard-markdown, .prose, [class*="markdown"]';

/** Mutations confined to controls are never text arriving. */
const CONTROL =
  'button, [role="button"], [role="menu"], [role="toolbar"], [data-testid*="action"]';

export interface ObserveOptions {
  /** Element to observe; scoped, never document.body (sidebar churn is noisy). */
  root: Element;
  /** The assistant message currently being written, or null if none is. */
  activeMessage: () => Element | null;
  /** Optional early end-of-stream signal, e.g. an attribute flip. */
  hasEnded?: (el: Element) => boolean;
  /** Called for every emitted Chunk, for debugging. */
  onDebug?: (message: string) => void;
}

const contentOf = (el: Element): Element => el.querySelector(CONTENT) ?? el;

export function observeStream(
  { root, activeMessage, hasEnded, onDebug }: ObserveOptions,
  handlers: AdapterHandlers,
  now: () => number,
): () => void {
  let current: Element | null = null;
  let lastLength = 0;
  let endTimer: ReturnType<typeof setTimeout> | undefined;
  let streaming = false;
  let chunkCount = 0;

  const finish = (reason: "quiescence" | "signal") => {
    if (!streaming) return;
    streaming = false;
    clearTimeout(endTimer);
    onDebug?.(`stream ended after ${chunkCount} chunks (${reason})`);
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

      // Ignore callbacks that only touched buttons, menus or toolbars.
      const touchedProse = records.some((r) => {
        const el =
          r.target.nodeType === Node.ELEMENT_NODE
            ? (r.target as Element)
            : r.target.parentElement;
        return el ? !el.closest(CONTROL) : false;
      });
      if (!touchedProse) return;

      const body = contentOf(active);
      const text = body.textContent ?? "";

      // A different message is now the active one: adopt its current length as
      // the baseline. Without this, switching (or the very first callback)
      // reports the entire existing message as one enormous Chunk — which is
      // what made it fire on unrelated page changes.
      if (active !== current) {
        current = active;
        lastLength = text.length;
        streaming = false;
        chunkCount = 0;
        return;
      }

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

      if (!streaming) {
        streaming = true;
        chunkCount = 0;
      }
      chunkCount += 1;

      const chunk: Chunk = {
        text: added,
        chars: delta,
        isCode,
        endsSentence: /[.!?]["')\s]*$/.test(added),
        at: now(),
      };
      onDebug?.(
        `chunk ${chunkCount}: ${delta} chars${isCode ? " [code]" : ""}` +
          `${chunk.endsSentence ? " [sentence]" : ""}`,
      );
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
