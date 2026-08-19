---
id: 9
title: How an oversized Chunk should sound
labels: [wayfinder:prototype]
status: open
assignee:
blocked-by: []
---

## Question

[Live DOM verification](0006-live-dom-verification.md) measured single Chunks of **1,825 characters (chatgpt.com) and 5,405 characters (claude.ai)** — one observer callback dumping a whole code block at once. Under the settled Direct mapping that is exactly one note, identical to a 3-character Chunk. Typical Chunks are far smaller: median 3 chars on chatgpt.com, 33 on claude.ai.

So what should a huge arrival sound like?

- **One note, unchanged** — honest to "one sound per Chunk", but a 5,000-character dump landing as a single quiet ping feels like a missed beat.
- **One accented note** — same note, louder/brighter/lower, scaled by size. Keeps the 1:1 rule while making bulk arrivals feel weighty.
- **A short burst** — split into a few notes so the volume of text is audible as duration. Bends the 1:1 rule; risks reintroducing the "music alongside the stream" feel that got the smoothed mappings rejected.

Also settle the general curve: should gain/pitch vary continuously with Chunk size (median 3 chars vs p90 43 is a wide range), or should size only matter past a threshold? Extend the voicing prototype with a code-block-heavy stream replaying real measured Chunk sizes, and pick by ear.

Note the risk: whatever wins must not make ordinary prose streaming feel uneven, since small-Chunk variation is the common case.
