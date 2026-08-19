---
id: 13
title: Sample extraction pipeline and instrument definitions
labels: [wayfinder:task]
status: open
assignee:
blocked-by: []
---

## Question

Task. Produce the 8-instrument roster from [Instrument library](0008-instrument-library.md): kalimba, piano, acoustic guitar, electric guitar, bass, harp, **pizzicato** violin, sitar.

- `scripts/extract-samples.ts` — fetch from the CC0/MIT sources named in the research, extract ~1 note per octave, normalise, trim silence, encode, write to `assets/samples/<instrument>/<note>.<ext>` with stable filenames.
- Commit **both** the script and its output.
- `src/instruments/` definitions: sample map, base register, decay, reverb amount, pitch-movement default and **gain trim** so the roster sits level with itself.
- Record each instrument's source and licence next to its definition.

Independent of the extension shell — can proceed in parallel with the skeleton.
