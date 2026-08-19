---
id: 1
title: Audio tech for MV3 content scripts
labels: [wayfinder:research]
status: closed
assignee: jass
blocked-by: []
---

## Question

Which audio approach fits a Chrome Manifest V3 extension that must trigger sounds with low latency from a content script reacting to DOM mutations? Candidates: Tone.js, raw Web Audio API, Strudel, playing via an offscreen document, or plain `<audio>`/sample playback. Cover:

- Autoplay / user-gesture unlock rules as they apply to content scripts — when can an AudioContext actually start, and what unlock gesture patterns do existing extensions use?
- MV3 constraints: content-script CSP and bundling implications for each library, offscreen-document audio as an alternative to in-page playback, message-passing latency if audio runs outside the page.
- How existing sound-on-page-event extensions (mechanical-keyboard SFX extensions and similar) implement playback.
- Latency and polyphony characteristics relevant to firing many small notes per second.

Deliver a concrete recommendation for this project.

## Resolution

Recommendation: use the raw Web Audio API directly in the content script (page/isolated world) with a small hand-rolled lookahead scheduler, not Tone.js, not Strudel, not an offscreen document, not plain `<audio>`. Offscreen documents add mandatory two-hop `chrome.runtime` messaging and auto-close after 30s of silence (too short for LLM "thinking" pauses), with no benefit since sound is inherently tied to a live tab. Strudel's cycle/pattern architecture is a mismatch for irregular DOM-triggered one-shot notes; `<audio>` lacks sample-accurate scheduling and clean polyphony. Unlock the `AudioContext` via a one-time `mousedown`/`keydown` listener calling `resume()`, mirroring Tone.js's and Strudel's own idioms — the user's prompt-submission gesture should reliably precede the first sound-triggering Chunk. Tone.js remains an acceptable fallback if hand-rolled voice/envelope management proves too costly, since it's architecturally just Web Audio API + scheduler + voice management.

Full findings, citations, and inference/fact distinctions: [../../research/audio-tech-for-mv3-content-scripts.md](../../research/audio-tech-for-mv3-content-scripts.md)
