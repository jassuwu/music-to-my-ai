import type { Chunk, InstrumentDefinition, Note } from "./types";
import { initMapping, mapChunk, releaseScale, type MappingState } from "./mapping";
import { Sampler } from "./sampler";

/**
 * Wires the mapping to the sampler through a small lookahead queue.
 *
 * The queue exists for sample-accurate timing rather than smoothing — notes
 * are still emitted the instant a Chunk lands.
 */
const LOOKAHEAD_SEC = 0.12;
const TICK_MS = 25;

export class Engine {
  private state: MappingState = initMapping();
  private queue: Array<{ note: Note; release: number }> = [];
  private timer: ReturnType<typeof setInterval> | undefined;
  private instrument: InstrumentDefinition;

  constructor(
    private readonly ctx: AudioContext,
    private readonly sampler: Sampler,
    instrument: InstrumentDefinition,
    private readonly master: GainNode,
  ) {
    this.instrument = instrument;
  }

  start(): void {
    this.timer ??= setInterval(() => this.drain(), TICK_MS);
  }

  stop(): void {
    clearInterval(this.timer);
    this.timer = undefined;
    this.queue = [];
  }

  setInstrument(inst: InstrumentDefinition): void {
    this.instrument = inst;
  }

  setVolume(volume: number): void {
    this.master.gain.setTargetAtTime(volume, this.ctx.currentTime, 0.02);
  }

  /** One Chunk in, one sound out. */
  onChunk(chunk: Chunk): void {
    const { state, notes } = mapChunk(this.state, chunk, this.instrument);
    this.state = state;
    const release = this.instrument.release * releaseScale(chunk.chars);
    for (const note of notes) this.queue.push({ note, release });
  }

  /** A finished response gets a short rising flourish. */
  onStreamEnd(): void {
    const base = this.state.degree;
    for (let i = 0; i < 3; i++) {
      this.queue.push({
        note: {
          atSec: this.ctx.currentTime + i * 0.09,
          midi: this.instrument.base + (this.instrument.scale[i] ?? 0) + 12,
          gain: this.instrument.gainTrim * (0.5 - i * 0.08),
          bright: 1.2,
        },
        release: this.instrument.release,
      });
    }
    // Carry half the walked height into the next reply instead of all of it.
    // The walk climbs on average and reflects at its top wall, so carrying
    // degree whole meant long sessions parked an octave or two above base
    // (the 0015 measurement). Halving keeps continuity between replies but
    // lets each one start lower and climb again.
    this.state = { ...initMapping(), degree: Math.floor(base / 2) };
  }

  private drain(): void {
    const horizon = this.ctx.currentTime + LOOKAHEAD_SEC;
    const due = this.queue.filter((q) => q.note.atSec < horizon);
    this.queue = this.queue.filter((q) => q.note.atSec >= horizon);
    for (const { note, release } of due) {
      this.sampler.play(note, this.instrument, release);
    }
  }
}
