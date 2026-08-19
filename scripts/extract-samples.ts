/**
 * Downloads the sparse sample set the sampler plays.
 *
 * Source: gleitz/midi-js-soundfonts, the pre-rendered per-note render of
 * FluidR3_GM (MIT; the hosting repo labels its derivative CC BY 3.0 — either
 * way it is bundlable with attribution). One uniform source covers the whole
 * roster, which beats juggling four sample projects with four licences.
 *
 * Sparse by design: two notes per octave, a fifth apart, so the sampler never
 * pitch-shifts more than ~3 semitones — far enough from the source note to
 * stay cheap, close enough to avoid the chipmunk artefacts that one-note-per-
 * octave can produce.
 *
 *   bun run scripts/extract-samples.ts
 */
import { mkdir, writeFile } from "node:fs/promises";

const BASE =
  "https://raw.githubusercontent.com/gleitz/midi-js-soundfonts/gh-pages/FluidR3_GM";

/** Our instrument id -> the General MIDI patch name in the soundfont. */
const ROSTER: Record<string, string> = {
  kalimba: "kalimba",
  piano: "acoustic_grand_piano",
  "acoustic-guitar": "acoustic_guitar_nylon",
  bass: "electric_bass_finger",
  harp: "orchestral_harp",
  sitar: "sitar",
};

/** C4 = 60. Two per octave keeps max pitch shift to ~3 semitones. */
const NOTES: Array<[name: string, midi: number]> = [
  ["C2", 36], ["G2", 43],
  ["C3", 48], ["G3", 55],
  ["C4", 60], ["G4", 67],
  ["C5", 72], ["G5", 79],
  ["C6", 84],
];

let downloaded = 0;
let missing = 0;
let bytes = 0;

for (const [id, patch] of Object.entries(ROSTER)) {
  const dir = `assets/samples/${id}`;
  await mkdir(dir, { recursive: true });
  const got: number[] = [];

  for (const [name, midi] of NOTES) {
    const res = await fetch(`${BASE}/${patch}-mp3/${name}.mp3`);
    if (!res.ok) {
      // Not every patch covers every octave; the sampler just uses the
      // closest note it does have.
      missing += 1;
      continue;
    }
    const buf = new Uint8Array(await res.arrayBuffer());
    await writeFile(`${dir}/${midi}.mp3`, buf);
    got.push(midi);
    downloaded += 1;
    bytes += buf.byteLength;
  }

  console.log(`${id.padEnd(18)} ${got.length} notes  [${got.join(", ")}]`);
}

console.log(
  `\n${downloaded} samples, ${(bytes / 1024 / 1024).toFixed(2)} MB total` +
    (missing ? `, ${missing} octaves unavailable (expected)` : ""),
);
