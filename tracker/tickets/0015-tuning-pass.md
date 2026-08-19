---
id: 15
title: End-to-end tuning pass
labels: [wayfinder:prototype]
status: open
assignee:
blocked-by: [11, 12, 13, 14]
---

## Question

The destination itself: the extension is assembled — does it actually sound good on real streams?

Sit with it on both sites and tune per instrument: register, decay, reverb, pitch movement and gain trim, so all 8 sit level and each one survives the fatigue test on a long answer. Confirm the closing flourish and abort sound land in every voice, and that fast floods stay pleasant with burst-thinning doing its job.

This is where the map ends: when this feels right, the v1 extension is done.

## Progress: the measurable half (2026-08-19, sonnet subagent, reviewed)

The pass was split honestly: an agent cannot hear, so everything measurable was done with numbers and everything by-ear was packaged into a harness.

**Levelling was measured at the wrong notes.** The original trims came from single reference notes, but the pitch walk (56% up, 44% down, reflecting at degree 13) has its degree deliberately carried across streams (`engine.ts` keeps `degree` through `onStreamEnd`), so a real session spends most of its time near the top wall — well above `base` for every mid/high instrument. Re-measured with walk-weighted ffmpeg volumedetect at the notes actually played: kalimba 2.17→3.10, piano 1.16→2.19, acoustic guitar 0.89→1.99, bass 0.71→0.72, harp 1.07→5.86, sitar 1.26→2.44. Applied, with before/after dB inline. A flat trim cannot fully fix a register-dependent spread (harp's walked notes span ~16dB), so these are provisional pending ears.

**Register safety clamp** in `mapping.ts`: the octave-drop and sub-octave transpositions are now skipped when they would newly push a note more than 5 semitones from the nearest sample (bass's sub-octave reached −20). Strictly scoped: cases already past budget from the walk itself are not silently altered.

**Overlap math**: at 6.6 chunks/sec, piano (7.3), sitar (8.6) and harp (9.2) stack more than ~6 simultaneous tails; flagged as harness defaults to try, not changed blind.

**The harness**: `prototypes/tuning-harness.html`, built by `bun run build:harness` against the real mapping/sampler/engine/instruments (no copies). Replays both measured rates with the measured chunk-size distribution, code bursts, a heavy-flush button, endurance mode, per-instrument sliders (release, reverb, gainTrim, register offset) with a paste-ready `define(...)` snippet, mid-stream A/B switching, a level-check button, and a live active-tails readout. Serve from the repo root (`python3 -m http.server`), open `/prototypes/tuning-harness.html`.

**Open for the ear session (the remaining half):**
1. **The walk parks at the ceiling.** Carrying `degree` across streams + the reflecting top wall means long sessions sit ~1-2 octaves above `base`, up to +19 semitones past the sample ceiling for harp. Decide by ear: reset or decay `degree` between streams, narrow the walk, or keep the drift as character. This interacts with the new trims — retune after deciding.
2. The three flagged releases (piano, sitar, harp) at chatgpt.com rates.
3. Whether the walk-weighted trims actually sit level to the ear, harp especially.
4. Found in passing: `StreamEndReason` is not threaded into the engine — an aborted stream plays the same rising flourish as a clean finish. The ticket asks for a distinct abort sound; still missing.
