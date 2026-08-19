import type { Chunk, InstrumentDefinition, Note } from "./types";

/**
 * The Direct mapping: exactly one sound per Chunk, fired the instant it lands,
 * never smoothed or rescheduled.
 *
 * Chosen by ear over quantized, arpeggio-drain and ambient alternatives. All of
 * those read as music playing *alongside* the stream; the naive 1:1 hit is what
 * makes the stream feel like it has impact. Do not add smoothing here.
 */

export interface MappingState {
  readonly degree: number;
  readonly count: number;
  /** AudioContext time of the previous Chunk, for burst-thinning. */
  readonly last: number;
}

export const initMapping = (): MappingState => ({
  degree: 0,
  count: 0,
  last: -99,
});

/** Deterministic per-Chunk hash: the same stream always yields the same pitches. */
function hash(str: string, salt: number): number {
  let h = 2166136261 ^ salt;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 4294967296;
}

function degreeToMidi(degree: number, inst: InstrumentDefinition): number {
  const scale = inst.scale;
  const n = scale.length;
  const octave = Math.floor(degree / n);
  const step = scale[((degree % n) + n) % n] ?? 0;
  return inst.base + step + 12 * octave;
}

/**
 * Semitones from `midi` to the nearest sample this instrument actually has.
 * The sampler always plays the closest sample at an adjusted playbackRate
 * (see sampler.ts), so this is exactly the shift that note will incur.
 */
function nearestSampleDistance(midi: number, inst: InstrumentDefinition): number {
  let best = Infinity;
  for (const key of Object.keys(inst.samples)) {
    const distance = Math.abs(Number(key) - midi);
    if (distance < best) best = distance;
  }
  return best;
}

/**
 * Within the sampled range, two-samples-per-octave means the sampler never
 * shifts more than ~4 semitones. 0015 tuning-pass register-sanity
 * measurement found the weight-driven transpositions below can push well
 * past that for register-mismatched cases (bass's -12 drop lands on MIDI
 * 28/30 at low scale degrees, 6-8 semitones from its lowest sample at 36;
 * -24 sub-octave is worse, up to -20). >5 semitones is treated as the
 * audible-artifact line.
 */
const SAMPLE_SHIFT_BUDGET = 5;

/**
 * How "big" a Chunk is, 0-1 on a log curve.
 *
 * Anchored so ordinary prose is unaffected: 0 at ~8 characters, 1 at ~800.
 * The common 1-40 char range therefore varies only slightly, and streaming
 * stays even — while a code-block flush (measured up to 5,405 chars) is
 * unmistakably heavier.
 */
export function weightOf(chars: number): number {
  const w = Math.log10(Math.max(1, chars) / 8) / Math.log10(100);
  return Math.min(1, Math.max(0, w));
}

export function mapChunk(
  state: MappingState,
  chunk: Chunk,
  inst: InstrumentDefinition,
): { state: MappingState; notes: Note[] } {
  // Gentle walk: pitch moves between hits rather than sitting still.
  const up = hash(chunk.text, state.count) > 0.44;
  const degree = Math.max(0, Math.min(13, state.degree + (up ? 1 : -1)));

  const weight = weightOf(chunk.chars);
  const undropped = degreeToMidi(degree, inst);

  // Past half weight the note drops an octave — mass, not just volume. Skip
  // the drop only when it would newly cross the sample-shift budget (i.e.
  // the undropped note was fine but dropping it breaks the budget) — a
  // register-mismatched instrument stays put rather than growling. If the
  // undropped note was already past budget (high-register overshoot from
  // the walk itself — see 0015 tuning-pass, out of scope here), the drop
  // still applies since it does not make that pre-existing case worse.
  let drop = 0;
  if (weight > 0.5) {
    const dropped = undropped - 12;
    const wasFine = nearestSampleDistance(undropped, inst) <= SAMPLE_SHIFT_BUDGET;
    const staysFine = nearestSampleDistance(dropped, inst) <= SAMPLE_SHIFT_BUDGET;
    if (staysFine || !wasFine) drop = -12;
  }
  const midi = undropped + drop;

  let gain = inst.gainTrim * (0.85 + 0.5 * weight);

  // Burst-thinning: back-to-back hits duck so a fast flood stays pleasant.
  const gap = chunk.at - state.last;
  if (gap < 0.09) gain *= 0.5;
  else if (gap < 0.18) gain *= 0.75;

  if (chunk.endsSentence) gain *= 1.15;

  const notes: Note[] = [
    {
      atSec: chunk.at,
      midi,
      gain,
      bright: (chunk.isCode ? 1.6 : 1) + 0.6 * weight,
    },
  ];

  // Very large arrivals get a sub-octave underneath: still one perceptual
  // hit, but with real bottom end. Same budget guard as the drop above —
  // skip only if it would newly break the budget (0015 tuning pass: bass's
  // sub-octave at low degrees reached -20 semitones from its lowest sample).
  if (weight > 0.8) {
    const subMidi = midi - 12;
    const midiFine = nearestSampleDistance(midi, inst) <= SAMPLE_SHIFT_BUDGET;
    const subFine = nearestSampleDistance(subMidi, inst) <= SAMPLE_SHIFT_BUDGET;
    if (subFine || !midiFine) {
      notes.push({
        atSec: chunk.at,
        midi: subMidi,
        gain: gain * 0.55,
        bright: 1,
      });
    }
  }

  return {
    state: { degree, count: state.count + 1, last: chunk.at },
    notes,
  };
}

/** Release multiplier for a Note — bigger arrivals ring longer. */
export const releaseScale = (chars: number): number => 1 + 1.2 * weightOf(chars);
