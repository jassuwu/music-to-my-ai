---
id: 11
title: Core engine — mapping, scheduler, sampler
labels: [wayfinder:task]
status: closed
assignee: jass
blocked-by: [10, 9]
---

## Question

Task. Implement `src/core/` — pure, no `chrome.*` APIs, lifted from the prototypes.

- **Direct mapping**: one note per Chunk on arrival, no smoothing. Port the validated module from [../../prototypes/voicing-prototype.html](../../prototypes/voicing-prototype.html) (scale degrees, gentle-walk pitch driver, burst-thinning) and apply the oversized-Chunk answer from [How an oversized Chunk should sound](0009-oversized-chunks.md).
- **Scheduler**: the lookahead queue pattern from [Audio tech for MV3 content scripts](0001-audio-tech-for-mv3-content-scripts.md), raw Web Audio.
- **Sampler**: closest-sample lookup plus `AudioBufferSourceNode.playbackRate` pitch shift, per [Instrument library](0008-instrument-library.md); decode every bundled instrument once at init so switching is instant.

Done when a synthetic Chunk sequence plays correctly in the content script, independent of any real site.

## Implementation note

Landed: `core/mapping.ts` (pure — Direct mapping, gentle-walk pitch, burst-thinning, the oversized-Chunk weight curve), `core/sampler.ts` (closest-sample lookup with `playbackRate` shift, procedural convolution reverb, decode-once-at-init), `core/engine.ts` (lookahead queue wiring mapping to sampler, plus the closing flourish).

Verified numerically against the sizes measured live — 3 chars: midi 71, gain 0.85, one note; 221 chars: drops an octave to midi 59, gain 1.21, longer release; 1,825+: midi 57, gain 1.35, two notes with the sub-octave layer. Burst-thinning ducks 30ms-apart hits from 0.85 to 0.42. **Open pending an actual listen.**

## Resolution

Verified live on claude.ai across a 295-chunk stream. The mapping, sampler and scheduler all behave, volume at the default 60% was judged right, and the closing flourish lands — notably it was distinct enough that it was first mistaken for a glitch before being recognised as deliberate, which is worth remembering during tuning: it reads as *an event*, and should stay musical enough to be unmistakably intentional.

Overall verdict on the sound was "aight" rather than delightful — acceptable to proceed, with the real polish deferred to [End-to-end tuning pass](0015-tuning-pass.md).

**The oversized-Chunk path barely fires on claude.ai.** A full 2,000-word code block arrived as ~295 incremental Chunks of 28-41 chars each, never as a bulk flush, so weight sat near 0.3 throughout and the octave-dropped heavy hit never triggered. The 5,405-char Chunk the probe once measured was a whole-message re-render, which the adapter's prose-node measurement correctly ignores. chatgpt.com (measured 1,825 chars) remains the likelier place for it to fire; if it never fires there either, the heavy-Chunk behaviour is effectively dormant and could be reconsidered.
