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
  // Past half weight the note drops an octave — mass, not just volume.
  const drop = weight > 0.5 ? -12 : 0;
  const midi = degreeToMidi(degree, inst) + drop;

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
  // hit, but with real bottom end.
  if (weight > 0.8) {
    notes.push({
      atSec: chunk.at,
      midi: midi - 12,
      gain: gain * 0.55,
      bright: 1,
    });
  }

  return {
    state: { degree, count: state.count + 1, last: chunk.at },
    notes,
  };
}

/** Release multiplier for a Note — bigger arrivals ring longer. */
export const releaseScale = (chars: number): number => 1 + 1.2 * weightOf(chars);
