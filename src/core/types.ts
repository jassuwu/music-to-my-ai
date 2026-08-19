/**
 * The contracts every other module is written against. Declared here in the
 * skeleton; implemented by later tickets.
 */

/**
 * One MutationObserver callback in which the Stream's text grew.
 *
 * Deliberately NOT one mutation record and NOT a model token: claude.ai's
 * median gap between growth events is 1ms, so per-record firing is unplayable.
 * Coalescing at the callback boundary measured 4.8 notes/sec on claude.ai and
 * 6.6 on chatgpt.com.
 */
export interface Chunk {
  /** Text added in this callback, concatenated across all growth in the batch. */
  readonly text: string;
  /** Characters added. Median 3 (chatgpt.com) to 33 (claude.ai); seen up to 5405. */
  readonly chars: number;
  /** Growth landed inside a code block. */
  readonly isCode: boolean;
  /** The added text closes a sentence. */
  readonly endsSentence: boolean;
  /** AudioContext time when the callback ran. */
  readonly at: number;
}

/** Per-site logic that locates the streaming response and reports Chunks. */
export interface Adapter {
  readonly id: string;
  /** Whether this adapter handles the current page. */
  matches(url: string): boolean;
  /**
   * Begin observing. Returns a teardown function.
   * Adapters must fail silent — never throw into the host page.
   */
  start(handlers: AdapterHandlers): () => void;
}

export interface AdapterHandlers {
  onChunk(chunk: Chunk): void;
  /** Fired once when a Stream is judged finished. */
  onStreamEnd(reason: StreamEndReason): void;
}

export type StreamEndReason = "quiescence" | "signal" | "aborted";

/** A sound to play. Produced by the mapping, consumed by the scheduler. */
export interface Note {
  /** Absolute AudioContext time. */
  readonly atSec: number;
  readonly midi: number;
  readonly gain: number;
  /** Multiplier on the instrument's filter cutoff — code blocks read brighter. */
  readonly bright: number;
}

/** A user-selectable Instrument: sample set plus its tuning constants. */
export interface InstrumentDefinition {
  readonly id: string;
  readonly label: string;
  /** Sample filenames keyed by the MIDI note they were recorded at. */
  readonly samples: Readonly<Record<number, string>>;
  readonly base: number;
  readonly scale: readonly number[];
  readonly reverb: number;
  /** Levels this instrument against the rest of the roster. */
  readonly gainTrim: number;
  readonly source: string;
  readonly licence: string;
}
