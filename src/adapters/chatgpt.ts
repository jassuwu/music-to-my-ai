import type { Adapter } from "../core/types";
import { observeStream } from "./shared";

/**
 * chatgpt.com.
 *
 * No trustworthy streaming flag exists here. Live measurement showed
 * `.result-streaming` present for ~800ms of a 36-second stream, and
 * `[data-testid="stop-button"]` flickering mid-stream and still present three
 * seconds after the response finished — so this adapter relies on quiescence
 * plus the shared baseline rule: a message only makes sound once it has been
 * adopted and then grows.
 *
 * Turn identity is never keyed off `data-testid` numbering, which the site
 * renumbers live (conversation-turn-2 -> 3 -> 2 was observed).
 */
export const chatgptAdapter: Adapter = {
  id: "chatgpt",

  matches: (url) => new URL(url).hostname.endsWith("chatgpt.com"),

  start(handlers, now) {
    const root = document.querySelector("main") ?? document.body;

    const activeMessage = (): Element | null => {
      const assistants = document.querySelectorAll(
        '[data-message-author-role="assistant"]',
      );
      return assistants.length ? (assistants[assistants.length - 1] ?? null) : null;
    };

    return observeStream(
      {
        root,
        activeMessage,
        onDebug: (m) => console.log(`[plainsong] ${m}`),
      },
      handlers,
      now,
    );
  },
};
