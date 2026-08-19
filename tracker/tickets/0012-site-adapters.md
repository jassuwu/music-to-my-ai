---
id: 12
title: Site adapters for claude.ai and chatgpt.com
labels: [wayfinder:task]
status: open
assignee: jass
blocked-by: [10]
---

## Question

Task. Implement `src/adapters/` against the contract measured in [Live DOM verification](0006-live-dom-verification.md).

- Observe `characterData` **and** `childList` with `subtree: true` — the split is 174/63 on chatgpt.com but 46/75 on claude.ai, so either alone loses half the stream on one site.
- Emit **one Chunk per observer callback with net text growth**, never per mutation record.
- Scope the observer to the conversation container, not `document.body` (a single sidebar update fired 27 attribute mutations).
- End-of-stream: **~900ms with no growth**, with claude.ai's `data-is-streaming` true→false flip as an early confirm. Do not trust chatgpt.com's stop button — it flickered mid-stream and lingered after the end.
- Never key turn identity off `data-testid` numbering; chatgpt.com renumbers turns live.
- Both sites break adapters every 2–6 months, so each adapter needs a defensive fallback and should fail silent, never throw into the page.

## Implementation note

Landed: `adapters/shared.ts` holds the observation logic both sites share, with per-site files for claude.ai (uses the confirmed `data-is-streaming` false-flip as a fast-path end signal) and chatgpt.com (quiescence only — the stop button proved untrustworthy). Growth is measured from the assistant element's own text length, which structurally excludes the composer that the skeleton's generic observer was picking up. Both adapters swallow their own exceptions so a site redesign degrades to silence. **Open pending verification on both live sites.**
