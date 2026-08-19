---
id: 3
title: Sound-mapping prototype
labels: [wayfinder:prototype]
status: closed
assignee: jass
blocked-by: []
---

## Question

What mapping from text-chunk arrival to musical events actually sounds delightful rather than chaotic? This is the soul of the product and can only be answered by listening. Build a throwaway HTML page that simulates realistic streaming cadence (bursty chunks, not neat ticks) and lets the user A/B switchable candidate mappings. Probe:

- Smoothing: how bursty chunk arrival becomes rhythm — quantize to a tempo grid, note-per-chunk with rate limiting, or arpeggiate a buffer of pending text?
- Pitch: what drives it — chunk size, hashed characters, or constrained randomness within a pentatonic scale?
- Texture: instrument/voice choice, whether punctuation or code blocks get accents.
- Endings: end-of-response flourish, abort sound (feeds the "end-of-response and error sounds" fog on the map).

Resolved when the user has heard the candidates and picked a direction worth building.

## Resolution

**Direct wins: one sound per Chunk, fired the instant it lands, with no smoothing.** Heard by ear against four alternatives in [../../prototypes/sound-mapping-prototype.html](../../prototypes/sound-mapping-prototype.html) (seeded streams, so each A/B replayed identical arrival timing).

The reason is the decisive finding: the naive mapping makes the stream feel like it has **impact** — the sound is the text arriving. Every smoothed mapping (grid quantization, arpeggio drain, ambient pad) reads instead as *music playing alongside* the stream, decoupled from it. Musicality bought at the cost of that 1:1 tie is a bad trade.

Consequences: Quantized, Arpeggio drain, Ambient pad and Typewriter are all discarded — not kept as alternate packs. **The pluggable sound-pack architecture from the charter is therefore dropped** (see [Control surface](0004-sound-packs-and-control-surface.md), rescoped). Only the mapping *structure* is settled here; the chunk-hit's character was judged "fine, but should feel nicer — more soothing, maybe upbeat", which is now [Voicing the Direct mapping](0007-voicing-the-direct-mapping.md).
