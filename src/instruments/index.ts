import type { InstrumentDefinition } from "../core/types";

/**
 * The v1 roster. Every instrument is a real recording from the same source,
 * so there is one licence to honour rather than four.
 *
 * Base register, reverb and release are carried over from the voicing
 * prototype. gainTrim is measured, not guessed: `scripts/measure-levels.sh`
 * reads the energy in each sample's first 300ms (these are one-shot hits, so
 * the attack is what you hear) and returns the gain that levels each
 * instrument against a -32dB target — but that script measures the 9 raw,
 * unshifted samples uniformly, which is not the register the mapping
 * actually plays.
 *
 * 0015 tuning pass re-measured at the real playing register: every reachable
 * (degree, drop) combination the Direct mapping's pentatonic walk can
 * produce, rendered through the sampler's actual closest-sample + playbackRate
 * path, and weighted by the walk's own stationary distribution (it is a
 * 56%-up/44%-down walk reflecting at degree 13, and `Engine.onStreamEnd`
 * never resets `degree` — so a session spends the bulk of its time pinned
 * near the top of the walk, not centered on `base`). For every instrument
 * whose base sits mid-to-high (kalimba, piano, acoustic-guitar, harp,
 * sitar), that means most notes are pitched well above the top sample (84)
 * and read quieter than the single-note measurement assumed; bass's walk
 * mostly stays inside the sample range so its trim barely moved. See the
 * per-instrument before/after comments below. gainTrim is a flat multiplier,
 * so it cannot fully correct a register-dependent effect this large (harp's
 * loudest and quietest walked notes span ~16dB) — the harness's gainTrim +
 * register sliders and "level check" button are the by-ear follow-up.
 */

/** Major pentatonic — bright without being able to sound wrong. */
const MAJOR_PENT = [0, 2, 4, 7, 9] as const;

const SOURCE =
  "gleitz/midi-js-soundfonts (pre-rendered FluidR3_GM), sparse 2-per-octave extraction";
const LICENCE = "FluidR3_GM: MIT (hosting repo labels its derivative CC BY 3.0)";

/** Every instrument ships the same sparse note set; see extract-samples. */
const SAMPLED_NOTES = [36, 43, 48, 55, 60, 67, 72, 79, 84] as const;

function samples(id: string): Record<number, string> {
  return Object.fromEntries(
    SAMPLED_NOTES.map((midi) => [midi, `samples/${id}/${midi}.mp3`]),
  );
}

function define(
  id: string,
  label: string,
  tuning: Pick<
    InstrumentDefinition,
    "base" | "reverb" | "release" | "gainTrim"
  >,
): InstrumentDefinition {
  return {
    id,
    label,
    samples: samples(id),
    scale: MAJOR_PENT,
    source: SOURCE,
    licence: LICENCE,
    ...tuning,
  };
}

export const INSTRUMENTS: readonly InstrumentDefinition[] = [
  // Trims are the geometric mean of the two 0015 measurements: single-note
  // (base register) and walk-weighted (ceiling register). The engine now
  // halves the walk's degree between replies, so a session oscillates
  // between those registers instead of parking at the top; each measurement
  // alone would be wrong half the time. Releases for piano/sitar/harp are
  // shortened from 1.1/1.3/1.4 so tails stay near ~6 simultaneous voices at
  // the measured 6.6 chunks/sec (0015 overlap table).
  //
  // The default: warm, rounded, and the one that won the voicing prototype.
  // 0015: single-note -38.71dB, walk-weighted -41.82dB; trims 2.17 / 3.10.
  define("kalimba", "Kalimba", { base: 69, reverb: 0.32, release: 0.9, gainTrim: 2.6 }),
  // 0015: single-note -33.26dB, walk-weighted -38.82dB; trims 1.16 / 2.19.
  define("piano", "Piano", { base: 60, reverb: 0.25, release: 0.95, gainTrim: 1.6 }),
  // 0015: single-note -31.01dB, walk-weighted -37.96dB; trims 0.89 / 1.99.
  define("acoustic-guitar", "Acoustic guitar", { base: 57, reverb: 0.22, release: 1, gainTrim: 1.33 }),
  // 0015: single-note -28.99dB, walk-weighted -29.18dB; trims 0.71 / 0.72
  // (bass's walk mostly stays inside the sample range, so it barely moved).
  define("bass", "Bass", { base: 40, reverb: 0.18, release: 0.9, gainTrim: 0.72 }),
  // 0015: single-note -32.58dB, walk-weighted -47.36dB; trims 1.07 / 5.86.
  // Largest register spread in the roster: harp's base (72) plus the walk's
  // high degrees push well past the top sample (84, +19st at degree 13), so
  // its two measurements disagree by ~15dB and the mean is the roughest
  // compromise here — first candidate to adjust if it sticks out by ear.
  define("harp", "Harp", { base: 72, reverb: 0.45, release: 1.15, gainTrim: 2.5 }),
  // 0015: single-note -33.98dB, walk-weighted -39.75dB; trims 1.26 / 2.44.
  define("sitar", "Sitar", { base: 62, reverb: 0.35, release: 1.05, gainTrim: 1.75 }),
];

export const DEFAULT_INSTRUMENT_ID = "kalimba";

export function getInstrument(id: string): InstrumentDefinition {
  return (
    INSTRUMENTS.find((i) => i.id === id) ??
    INSTRUMENTS.find((i) => i.id === DEFAULT_INSTRUMENT_ID)!
  );
}
