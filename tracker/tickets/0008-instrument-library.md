---
id: 8
title: "Instrument library: samples or synthesis"
labels: [wayfinder:research]
status: closed
assignee: jass
blocked-by: []
---

## Question

[Voicing the Direct mapping](0007-voicing-the-direct-mapping.md) made the Instrument user-selectable and asked for recognisable real instruments — piano, acoustic and electric guitar, bass, violin, sitar, veena, harmonium, harp. Additive synthesis cannot convincingly produce those, so how should a personal-toy MV3 extension deliver them?

- **Approach:** bundled audio samples, a SoundFont (sf2/sfz) player, an existing browser sample library (`smplr`, `soundfont-player`, Tone.js `Sampler`), or per-instrument hand-tuned synthesis. Note that the settled audio decision is raw Web Audio in the content script — assess each option against that, not against a framework rewrite.
- **Assets and licensing:** which freely and clearly licensed sample sets cover this roster, including the Indian instruments (sitar, veena, harmonium) that general-MIDI sets often cover poorly. Name specific candidates with their licence.
- **Size and delivery:** bundling samples in the extension package vs fetching on demand — MV3 `web_accessible_resources`, host permissions and CSP implications, realistic per-instrument and total download size, and whether one-note-per-octave sampling with playback-rate pitch shifting is good enough to keep it small.
- **Latency and memory:** decode-and-cache strategy so the first Chunk after switching instruments is not late, and the cost of holding several instruments decoded at once.
- **Fit to the Direct mapping:** these are one-shot plucked/struck/bowed hits at up to ~15 notes/second. Flag any instrument whose character depends on sustain or articulation and would sound wrong when triggered this way (bowed violin and harmonium are the obvious risks).

Deliver a concrete recommendation: the approach, the specific sample source, and a shippable v1 roster with Kalimba-equivalent quality as the bar.

## Resolution

**Bundle sparse, offline-extracted flat sample files** (~1 note/octave, `AudioBufferSourceNode.playbackRate` fills the gaps — the same closest-note-and-pitch-shift technique Tone.js `Sampler` uses internally) on top of the already-settled raw Web Audio API. No SF2/SFZ parsing at runtime and no CDN fetch at runtime: MV3 now gates content-script `fetch()` behind the *host page's* own CORS/CSP (chromium.org), so pulling samples from claude.ai/chatgpt.com at runtime is unreliable — assets ship in the package and load via `web_accessible_resources` + `chrome.runtime.getURL()`, per [0001](0001-audio-tech-for-mv3-content-scripts.md)'s established pattern. Decode all bundled instruments once at content-script init so instrument switching never re-fetches or re-decodes.

**v1 roster (8 instruments, all CC0/MIT-or-equivalent, all real recordings):** kalimba (keep current synth or upgrade to CC0 samples), piano (VCSL), acoustic guitar (FreePats), electric guitar (FreePats), bass (FreePats), harp (FreePats/VCSL), violin as **pizzicato** specifically (Univ. of Iowa), sitar (FluidR3_GM's GM "Sitar" patch, extracted offline). Each lands in the low hundreds of KB to ~1.5MB after sparse extraction; whole roster in the single-digit MB.

**Deferred, not in v1:** veena (plucked, would fit the one-shot mapping fine, but no bundling-safe licensed source exists — Pianobook's only candidate explicitly forbids redistributing raw samples inside a product) and harmonium (no good source *and* its bellows-driven sustain/drone character is a poor structural fit for one-shot triggering regardless).

Full findings, citations, and verified/inferred distinctions: [../../research/instrument-library.md](../../research/instrument-library.md)
