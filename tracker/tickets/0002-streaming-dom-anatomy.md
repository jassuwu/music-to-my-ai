---
id: 2
title: Streaming DOM anatomy of claude.ai and chatgpt.com
labels: [wayfinder:research]
status: closed
assignee: jass
blocked-by: []
---

## Question

How does streamed assistant text actually land in the DOM on claude.ai and on chatgpt.com? For each site:

- What container holds the in-progress assistant message, and what selectors or attributes are stable enough for an adapter to hook (data attributes vs volatile hashed class names)?
- What granularity and cadence do MutationObserver callbacks see during streaming — characterData growth, node appends, wholesale markdown re-renders?
- How does end-of-stream manifest in the DOM (attribute flips, cursor element removal, action buttons appearing)?
- What selectors have existing open-source extensions for these sites used, and how often have they broken?

Flag anything that can only be settled by live inspection of the signed-in sites, so it can become a follow-up task ticket.

## Resolution

Both sites expose stable, non-hashed `data-testid`/`data-*` hooks for message turns (claude.ai: `data-is-streaming`, `[data-testid="user-message"]`/`"stop-button"`; chatgpt.com: `[data-testid^="conversation-turn-"]`, `data-message-author-role`, `[data-testid="stop-button"]`), confirmed live from `pionxzh/chatgpt-exporter` and `KudoAI/chatgpt.js` source (both fetched today) and corroborated by `claude-a11y` and `Claude-Powerest-Manager_Enhancer`. Stop-button presence/absence is the best-corroborated end-of-stream signal on chatgpt.com (production usage in chatgpt.js, pushed 2026-08-10); claude.ai's `data-is-streaming` attribute is the top candidate there but its "true" state was never directly observed in any source. Dated commit history from three independent OSS projects shows both sites' DOM breaks adapters roughly every 2–6 months. MutationObserver granularity/cadence during actual streaming (characterData vs childList vs subtree replace) was **not** settled by any source and needs live, signed-in inspection — along with confirming claude.ai's `data-is-streaming="true"` behavior and chatgpt.com's current streaming-class/tag situation.

Full findings, citations, and a numbered live-inspection follow-up list: [../../research/streaming-dom-anatomy.md](../../research/streaming-dom-anatomy.md)
