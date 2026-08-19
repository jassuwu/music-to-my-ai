---
id: 6
title: Live DOM verification on claude.ai and chatgpt.com
labels: [wayfinder:task]
status: closed
assignee: jass
blocked-by: []
---

## Question

Task: settle by live, signed-in inspection what the [Streaming DOM anatomy](0002-streaming-dom-anatomy.md) research could not confirm from sources — see the "needs live inspection" list in [../../research/streaming-dom-anatomy.md](../../research/streaming-dom-anatomy.md). Chiefly, per site:

- MutationObserver granularity and cadence during real streaming (characterData growth vs childList appends vs wholesale subtree re-renders).
- claude.ai: does `data-is-streaming="true"` actually appear mid-stream and flip to `"false"` on completion?
- chatgpt.com: the current streaming indicator (stop-button presence per chatgpt.js, vs any streaming class/tag), and whether action buttons are truly absent while streaming.

Method options for the resolving session: a DevTools console snippet the user pastes while triggering a response on each site (a /wizard checklist fits), or driving the user's signed-in browser via the codex-verify-ui agent. The answer records confirmed selectors, mutation cadence notes, and end-of-stream signals — the facts the two v1 Adapters will be built on.

## Resolution

Measured live on both signed-in sites with [../../prototypes/dom-probe.js](../../prototypes/dom-probe.js), on ~200-word answers containing a code block. Raw reports are in the ticket thread; the load-bearing findings:

**No wholesale re-renders on either site.** `bulkRerenders_3plusRemoved` was 0 on both — the feared "React replaces the whole subtree" case did not occur. MutationObserver is a sound basis for the Adapters.

**Growth arrives through both channels, in different proportions.** chatgpt.com: 174 growth events via `characterData` vs 63 via `childList`. claude.ai: 46 via `characterData` vs 75 via `childList` (markdown re-rendering appends nodes). **Adapters must observe `characterData` *and* `childList` with `subtree: true`** — either alone misses roughly half the stream on one of the two sites.

**A Chunk is one observer callback, not one mutation record.** claude.ai's median gap between growth events is **1ms** — dozens land in a single callback — while chatgpt.com's is 40ms with 136 of 237 gaps under 50ms. Firing per record would produce unplayable machine-gun bursts. Coalescing per callback yields **4.8 events/sec (claude) and 6.6 events/sec (chatgpt)** — a musically sane note rate that needs no artificial throttle, with burst-thinning still covering the sub-50ms clusters.

**End-of-stream: quiescence is the primary signal, attributes are a fast-path.** claude.ai confirmed `data-is-streaming` flipping cleanly `true → false` once, at the true end (28503ms) — the desk research's top candidate is real, and the element is created with `"true"` already set, so only the closing flip is observable as a mutation. chatgpt.com gave **no trustworthy flag**: `.result-streaming` existed for ~800ms of a 36-second stream, and `[data-testid="stop-button"]` flickered mid-stream *and was still present ~3s after the stream ended*. So: **end-of-stream = ~900ms with no growth**, with claude.ai's attribute flip used as an early confirm. This also removes any need to re-check chatgpt.com's streaming flag later.

**Two traps for the Adapters.** (1) chatgpt.com **renumbers** `data-testid` on turns live — `conversation-turn-2 → 3 → 2` was observed — so turn identity must never be keyed off that number. (2) Observing `document.body` for attributes is very noisy: a single sidebar update emitted 27 `history-item-N-options` renames. Scope the observer to the conversation container.

**Container hooks, confirmed present:** claude.ai `[data-is-streaming]` on the message wrapper (plus `.font-claude-response`, `[data-testid="user-message"]`); chatgpt.com `[data-message-author-role="assistant"]` inside `[data-testid^="conversation-turn-"]` (a `<section>`).

**Newly surfaced:** oversized Chunks are real — a single callback delivered **1,825 chars on chatgpt.com and 5,405 on claude.ai** when a code block flushed. What that should sound like is [How an oversized Chunk should sound](0009-oversized-chunks.md).
