---
id: 11
title: Core engine — mapping, scheduler, sampler
labels: [wayfinder:task]
status: open
assignee:
blocked-by: [10, 9]
---

## Question

Task. Implement `src/core/` — pure, no `chrome.*` APIs, lifted from the prototypes.

- **Direct mapping**: one note per Chunk on arrival, no smoothing. Port the validated module from [../../prototypes/voicing-prototype.html](../../prototypes/voicing-prototype.html) (scale degrees, gentle-walk pitch driver, burst-thinning) and apply the oversized-Chunk answer from [How an oversized Chunk should sound](0009-oversized-chunks.md).
- **Scheduler**: the lookahead queue pattern from [Audio tech for MV3 content scripts](0001-audio-tech-for-mv3-content-scripts.md), raw Web Audio.
- **Sampler**: closest-sample lookup plus `AudioBufferSourceNode.playbackRate` pitch shift, per [Instrument library](0008-instrument-library.md); decode every bundled instrument once at init so switching is instant.

Done when a synthetic Chunk sequence plays correctly in the content script, independent of any real site.
