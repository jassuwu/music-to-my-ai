---
id: 13
title: Sample extraction pipeline and instrument definitions
labels: [wayfinder:task]
status: closed
assignee: jass
blocked-by: []
---

## Question

Task. Produce the 8-instrument roster from [Instrument library](0008-instrument-library.md): kalimba, piano, acoustic guitar, electric guitar, bass, harp, **pizzicato** violin, sitar.

- `scripts/extract-samples.ts` — fetch from the CC0/MIT sources named in the research, extract ~1 note per octave, normalise, trim silence, encode, write to `assets/samples/<instrument>/<note>.<ext>` with stable filenames.
- Commit **both** the script and its output.
- `src/instruments/` definitions: sample map, base register, decay, reverb amount, pitch-movement default and **gain trim** so the roster sits level with itself.
- Record each instrument's source and licence next to its definition.

Independent of the extension shell — can proceed in parallel with the skeleton.

## Resolution

**One uniform source instead of four.** The research named VCSL, FreePats, University of Iowa and FluidR3_GM across the roster; all eight instruments turned out to be available as pre-rendered per-note files from a single source — `gleitz/midi-js-soundfonts`' render of **FluidR3_GM** — including `pizzicato_strings` for the violin. One licence to honour beats four, and every note is guaranteed present rather than needing per-project extraction from SFZ/SF2 archives. Verified the sitar samples are genuinely distinct audio (identical byte size to piano at A3 was coincidence; checksums differ).

**Sparse set: two notes per octave, a fifth apart** (C and G, MIDI 36-84), so the sampler never pitch-shifts more than ~3 semitones — cheaper than dense sampling, without the artefacts one-per-octave can produce. **72 samples, 1.32 MB total**, well inside the single-digit-MB budget.

**No ffmpeg step.** The ticket anticipated normalise/trim/encode; the soundfont renders are already trimmed per-note mp3s that `decodeAudioData` handles directly, so the pipeline is a plain fetch-and-write. One less dependency.

`scripts/extract-samples.ts` and its output are both committed. `src/instruments/` carries the 8 definitions with base register, reverb, release and **gainTrim starting values** — the trims can only be finalised by listening to the roster back to back, which is [End-to-end tuning pass](0015-tuning-pass.md).
