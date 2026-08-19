import type { Adapter } from "../core/types";
import { observeStream } from "./shared";

/**
 * claude.ai.
 *
 * Live measurement confirmed `data-is-streaming` on the message wrapper: the
 * element is created with "true" already set and flips to "false" exactly once,
 * at the true end of the response. That gives a clean fast-path end signal;
 * quiescence still backstops it in case the attribute is renamed.
 */
export const claudeAdapter: Adapter = {
  id: "claude",

  matches: (url) => new URL(url).hostname.endsWith("claude.ai"),

  start(handlers, now) {
    const root = document.querySelector("main") ?? document.body;

    const activeMessage = (): Element | null => {
      const streaming = document.querySelector('[data-is-streaming="true"]');
      if (streaming) return streaming;
      // Fallbacks, in case the attribute disappears in a redesign.
      const responses = document.querySelectorAll(
        '[data-is-streaming], .font-claude-response, .font-claude-message',
      );
      return responses.length ? (responses[responses.length - 1] ?? null) : null;
    };

    return observeStream(
      {
        root,
        activeMessage,
        hasEnded: (el) => el.getAttribute("data-is-streaming") === "false",
      },
      handlers,
      now,
    );
  },
};
