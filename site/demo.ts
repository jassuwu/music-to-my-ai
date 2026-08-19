/**
 * The demo on the landing page: a fake reply, streamed at claude.ai's measured
 * rate, played by the REAL engine.
 *
 * Nothing here re-implements the extension. `src/core/{sampler,engine,mapping}`
 * and `src/instruments` are imported unmodified, exactly as the tuning harness
 * does it, so what a visitor hears on this page is what they get after
 * installing. The only shim is the one line below.
 */
import type { Chunk } from "../src/core/types";
import { Sampler } from "../src/core/sampler";
import { Engine } from "../src/core/engine";
import { INSTRUMENTS, DEFAULT_INSTRUMENT_ID, getInstrument } from "../src/instruments";

/* The sampler fetches through chrome.runtime.getURL, which does not exist on a
   web page. Sample paths are already relative ("samples/kalimba/60.mp3") and
   the build copies them next to this script, so the shim is identity. */
(globalThis as unknown as { chrome: typeof chrome }).chrome = {
  runtime: { getURL: (path: string) => path },
} as typeof chrome;

/** The reply the page performs. It explains itself while being the example. */
const REPLY =
  "here's the thing: every time a few more characters of this sentence land " +
  "on the page, one note plays. nothing is looping underneath. the pace " +
  "you're hearing is the pace i'm typing, so a long answer just makes a " +
  "longer piece of music.";

/** 4.8 chunks/sec — claude.ai, measured (ticket 0006). */
const RATE_MS = 208;

/* Chunk sizes on the real sites are wildly uneven: median 33 chars on
   claude.ai, 3 on chatgpt.com, occasional bursts far past either. A fixed
   split sounds metronomic and undersells the thing, so this cycles through a
   spread of targets and breaks on word boundaries. */
const SIZES = [8, 21, 13, 34, 5, 17, 26, 9];

function split(text: string): string[] {
  const words = text.split(" ");
  const out: string[] = [];
  let buf = "";
  let i = 0;
  for (const word of words) {
    buf += (buf ? " " : "") + word;
    if (buf.length >= (SIZES[i % SIZES.length] ?? 14)) {
      out.push(buf);
      buf = "";
      i++;
    }
  }
  if (buf) out.push(buf);
  return out;
}

const $ = <T extends HTMLElement>(id: string): T =>
  document.getElementById(id) as T;

const play = $<HTMLButtonElement>("play");
const voice = $<HTMLSelectElement>("voice");
const out = $<HTMLParagraphElement>("out");

for (const inst of INSTRUMENTS) {
  const option = document.createElement("option");
  option.value = inst.id;
  option.textContent = inst.label.toLowerCase();
  voice.append(option);
}
voice.value = DEFAULT_INSTRUMENT_ID;

let ctx: AudioContext | undefined;
let sampler: Sampler | undefined;
let engine: Engine | undefined;
let timer: ReturnType<typeof setInterval> | undefined;

/* Built inside the click, not before it: Chrome refuses to start an
   AudioContext without a gesture and logs a warning for every one created
   early. Same reasoning as src/core/unlock.ts. */
async function wake(): Promise<Engine> {
  if (!ctx) {
    ctx = new AudioContext();
    const master = ctx.createGain();
    master.gain.value = 0.6;
    master.connect(ctx.destination);
    sampler = new Sampler(ctx, master);
    engine = new Engine(ctx, sampler, getInstrument(voice.value), master);
    engine.start();
  }
  const instrument = getInstrument(voice.value);
  engine!.setInstrument(instrument);
  await sampler!.load(instrument);
  return engine!;
}

async function start(): Promise<void> {
  clearInterval(timer);
  const engine = await wake();

  const pieces = split(REPLY);
  let i = 0;
  out.textContent = "";
  out.classList.add("typing");
  play.disabled = true;
  play.textContent = "playing";

  timer = setInterval(() => {
    const piece = pieces[i++];
    if (piece === undefined) {
      clearInterval(timer);
      engine.onStreamEnd();
      out.classList.remove("typing");
      play.disabled = false;
      play.textContent = "play it again";
      return;
    }
    const text = (i === 1 ? "" : " ") + piece;
    out.textContent += text;
    const chunk: Chunk = {
      text,
      chars: text.length,
      isCode: false,
      endsSentence: /[.!?]$/.test(piece),
      at: ctx!.currentTime,
    };
    engine.onChunk(chunk);
  }, RATE_MS);
}

play.addEventListener("click", () => void start());
voice.addEventListener("change", () => void wake());
