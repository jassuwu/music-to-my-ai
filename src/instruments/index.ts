import type { InstrumentDefinition } from "../core/types";

/**
 * The v1 roster. Every instrument is a real recording from the same source,
 * so there is one licence to honour rather than four.
 *
 * The tuning constants below (base register, reverb, release, gain trim) are
 * starting points carried over from the voicing prototype. The end-to-end
 * tuning pass is what finalises them — in particular gainTrim, which can only
 * be set by listening to the roster back to back.
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
  // The default: warm, rounded, and the one that won the voicing prototype.
  define("kalimba", "Kalimba", { base: 69, reverb: 0.32, release: 0.9, gainTrim: 1 }),
  define("piano", "Piano", { base: 60, reverb: 0.25, release: 1.1, gainTrim: 0.85 }),
  define("acoustic-guitar", "Acoustic guitar", { base: 57, reverb: 0.22, release: 1, gainTrim: 0.95 }),
  define("electric-guitar", "Electric guitar", { base: 57, reverb: 0.3, release: 1.2, gainTrim: 0.9 }),
  define("bass", "Bass", { base: 40, reverb: 0.18, release: 0.9, gainTrim: 0.8 }),
  define("harp", "Harp", { base: 72, reverb: 0.45, release: 1.4, gainTrim: 1 }),
  // Pizzicato, not bowed — a bowed note's character is its sustain, which
  // one-shot triggering cannot represent.
  define("violin", "Violin (pizzicato)", { base: 64, reverb: 0.3, release: 0.8, gainTrim: 1 }),
  define("sitar", "Sitar", { base: 62, reverb: 0.35, release: 1.3, gainTrim: 0.9 }),
];

export const DEFAULT_INSTRUMENT_ID = "kalimba";

export function getInstrument(id: string): InstrumentDefinition {
  return (
    INSTRUMENTS.find((i) => i.id === id) ??
    INSTRUMENTS.find((i) => i.id === DEFAULT_INSTRUMENT_ID)!
  );
}
