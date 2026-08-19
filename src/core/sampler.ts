import type { InstrumentDefinition, Note } from "./types";

/**
 * Sparse sampler. Each instrument ships two notes per octave; anything in
 * between is the closest sample played at an adjusted rate, so the shift is
 * never more than ~3 semitones. This is the technique Tone.js `Sampler` uses
 * internally, reimplemented directly on AudioBufferSourceNode to keep the
 * zero-dependency raw-Web-Audio decision intact.
 */
export class Sampler {
  private readonly buffers = new Map<string, Map<number, AudioBuffer>>();
  private readonly dry: GainNode;
  private readonly verbSend: GainNode;

  constructor(
    private readonly ctx: AudioContext,
    private readonly master: GainNode,
  ) {
    // Notes overlap: at ~7 chunks/sec with a 1s release, a dozen can sound at
    // once, and reverb sits on top of that. A limiter before the master keeps
    // a fast flood from clipping without touching individual notes.
    const limiter = ctx.createDynamicsCompressor();
    limiter.threshold.value = -6;
    limiter.knee.value = 3;
    limiter.ratio.value = 12;
    limiter.attack.value = 0.002;
    limiter.release.value = 0.15;
    limiter.connect(master);

    this.dry = ctx.createGain();
    this.dry.connect(limiter);

    // Procedural hall impulse — no impulse-response file to ship.
    const verb = ctx.createConvolver();
    const len = Math.floor(ctx.sampleRate * 2.2);
    const buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const data = buf.getChannelData(ch);
      for (let i = 0; i < len; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6);
      }
    }
    verb.buffer = buf;

    this.verbSend = ctx.createGain();
    this.verbSend.connect(verb);
    verb.connect(limiter);
  }

  /** Decode every note of an instrument once, so switching is instant. */
  async load(inst: InstrumentDefinition): Promise<void> {
    if (this.buffers.has(inst.id)) return;
    const notes = new Map<number, AudioBuffer>();

    await Promise.all(
      Object.entries(inst.samples).map(async ([midi, path]) => {
        try {
          const res = await fetch(chrome.runtime.getURL(path));
          const decoded = await this.ctx.decodeAudioData(await res.arrayBuffer());
          notes.set(Number(midi), decoded);
        } catch {
          // A missing octave is survivable — the closest note covers it.
        }
      }),
    );

    this.buffers.set(inst.id, notes);
  }

  private closest(inst: InstrumentDefinition, midi: number): number | undefined {
    const notes = this.buffers.get(inst.id);
    if (!notes || notes.size === 0) return undefined;
    let best: number | undefined;
    let bestDistance = Infinity;
    for (const sampled of notes.keys()) {
      const distance = Math.abs(sampled - midi);
      if (distance < bestDistance) {
        bestDistance = distance;
        best = sampled;
      }
    }
    return best;
  }

  play(note: Note, inst: InstrumentDefinition, release: number): void {
    const sampled = this.closest(inst, note.midi);
    if (sampled === undefined) return;
    const buffer = this.buffers.get(inst.id)?.get(sampled);
    if (!buffer) return;

    const t = Math.max(note.atSec, this.ctx.currentTime + 0.001);

    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    src.playbackRate.value = Math.pow(2, (note.midi - sampled) / 12);

    const tone = this.ctx.createBiquadFilter();
    tone.type = "lowpass";
    tone.frequency.value = Math.min(18000, 3200 * note.bright);

    const env = this.ctx.createGain();
    env.gain.setValueAtTime(Math.max(0.0001, note.gain), t);
    env.gain.exponentialRampToValueAtTime(0.0001, t + release);

    const send = this.ctx.createGain();
    send.gain.value = inst.reverb;

    src.connect(tone);
    tone.connect(env);
    env.connect(this.dry);
    env.connect(send);
    send.connect(this.verbSend);

    src.start(t);
    src.stop(t + release + 0.05);
  }
}
