import type { Adapter } from "../core/types";
import { observeStream } from "./shared";

/**
 * claude.ai.
 *
 * Live measurement confirmed `data-is-streaming` on the message wrapper: the
 * element is created with "true" already set and flips to "false" exactly once,
 * at the true end of the response.
 *
 * That attribute is treated as authoritative — if nothing is streaming, there
 * is no active message and nothing makes a sound. The looser selectors are a
 * fallback for the day the attribute is renamed, not a parallel signal.
 */
export const claudeAdapter: Adapter = {
  id: "claude",

  matches: (url) => new URL(url).hostname.endsWith("claude.ai"),

  start(handlers, now) {
    const root = document.querySelector("main") ?? document.body;

    const activeMessage = (): Element | null => {
      const streaming = document.querySelector('[data-is-streaming="true"]');
      if (streaming) return streaming;

      // Only fall back if the attribute has vanished from the page entirely,
      // which would mean a redesign rather than "nothing is streaming".
      if (document.querySelector("[data-is-streaming]")) return null;

      const responses = document.querySelectorAll(
        ".font-claude-response, .font-claude-message",
      );
      return responses.length ? (responses[responses.length - 1] ?? null) : null;
    };

    return observeStream(
      {
        root,
        activeMessage,
        hasEnded: (el) => el.getAttribute("data-is-streaming") === "false",
        onDebug: (m) => console.log(`[music-to-my-ai] ${m}`),
      },
      handlers,
      now,
    );
  },
};
