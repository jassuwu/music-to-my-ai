/**
 * 0015 tuning-pass harness — the by-ear half.
 *
 * Everything measurable about the roster (loudness levelling, register
 * safety, voice-overlap counts) was done with numbers, not this page — see
 * the ticket for the tables. What is left is judgment: does release length,
 * reverb, gain and register actually *feel* right per instrument, on
 * realistic streams, at both sites' rates, on a long answer, switching mid-
 * stream. That is what this harness is for.
 *
 * No copies of the mapping: this imports the REAL src/core/{mapping,
 * sampler,engine} and src/instruments, unmodified. Whatever a slider here
 * lands on pastes straight back into src/instruments/index.ts.
 *
 * Build:   bun run build:harness   (outputs tuning-harness.js next to this
 *          file — never into dist/, this never ships)
 * Run:     samples resolve as `../assets/samples/...` relative to this page
 *          (instruments/index.ts's own sample paths, resolved the same way
 *          the extension resolves them, just without chrome.runtime.getURL),
 *          and both file:// and a server rooted at prototypes/ break that
 *          traversal. Serve the REPO ROOT instead, one line, from the repo
 *          root directory:
 *            bunx serve .
 *          or:
 *            python3 -m http.server 8788
 *          then open http://localhost:<port>/prototypes/tuning-harness.html
 */
import type { Chunk, InstrumentDefinition } from "../src/core/types";
import { initMapping, mapChunk, releaseScale } from "../src/core/mapping";
import { Sampler } from "../src/core/sampler";
import { Engine } from "../src/core/engine";
import { whenUnlocked } from "../src/core/unlock";
import { INSTRUMENTS, DEFAULT_INSTRUMENT_ID } from "../src/instruments";

/* ---------------------------------------------------------------------- *
 * chrome.runtime.getURL shim — the sampler is real, unmodified code, and
 * fetches samples through it. Outside the extension there is no `chrome`
 * global, so this harness supplies the one method it calls: strip the
 * "samples/" prefix instruments/index.ts bakes in and resolve it relative
 * to this file (prototypes/ is a sibling of assets/).
 * ---------------------------------------------------------------------- */
(globalThis as unknown as { chrome: typeof chrome }).chrome = {
  runtime: {
    getURL: (path: string) => `../assets/${path}`,
  },
} as typeof chrome;

const $ = <T extends HTMLElement>(id: string): T => document.getElementById(id) as T;

/* ---------------------------------------------------------------------- *
 * Tuning state — one per instrument, seeded from the real definitions.
 * Sliders mutate this; currentDef() folds it back over the real object so
 * `id`, `label`, `samples` and `scale` never drift from source.
 * ---------------------------------------------------------------------- */
interface Tuning {
  release: number;
  reverb: number;
  gainTrim: number;
  registerOffset: number; // added to `base`; the slider users actually turn
}

const tunings = new Map<string, Tuning>(
  INSTRUMENTS.map((inst) => [
    inst.id,
    { release: inst.release, reverb: inst.reverb, gainTrim: inst.gainTrim, registerOffset: 0 },
  ]),
);

function currentDef(id: string): InstrumentDefinition {
  const base = INSTRUMENTS.find((i) => i.id === id)!;
  const t = tunings.get(id)!;
  return {
    ...base,
    release: t.release,
    reverb: t.reverb,
    gainTrim: t.gainTrim,
    base: base.base + t.registerOffset,
  };
}

function snippetFor(id: string): string {
  const d = currentDef(id);
  const label = INSTRUMENTS.find((i) => i.id === id)!.label;
  return (
    `define("${id}", "${label}", ` +
    `{ base: ${d.base}, reverb: ${d.reverb.toFixed(2)}, ` +
    `release: ${round2(d.release)}, gainTrim: ${round2(d.gainTrim)} }),`
  );
}
const round2 = (n: number): number => Math.round(n * 100) / 100;

/* ---------------------------------------------------------------------- *
 * Audio bootstrap — one AudioContext, one Sampler (shared buffer cache
 * across instruments), one Engine driving whichever instrument is "live".
 * ---------------------------------------------------------------------- */
let ctx: AudioContext;
let master: GainNode;
let sampler: Sampler;
let engine: Engine;
let liveId = DEFAULT_INSTRUMENT_ID;

// Shadow mapping state, one per instrument, used ONLY to drive the on-screen
// "active tails" readout (0015 Part A #3: release-seconds x rate = stacked
// voices). Same exported mapChunk the engine itself calls, fed the exact
// same chunks in the exact same order, so the degree walk it reports matches
// the audio 1:1 — this never touches playback.
const shadowState = new Map<string, ReturnType<typeof initMapping>>(
  INSTRUMENTS.map((i) => [i.id, initMapping()]),
);
const activeTails: Array<{ until: number }> = [];

async function boot(): Promise<void> {
  ctx = await whenUnlocked();
  master = ctx.createGain();
  master.gain.value = 0.8;
  master.connect(ctx.destination);
  sampler = new Sampler(ctx, master);
  engine = new Engine(ctx, sampler, currentDef(liveId), master);
  engine.start();

  $("unlock").style.display = "none";
  $("loading").textContent = "Loading all six instruments…";
  await Promise.all(INSTRUMENTS.map((inst) => sampler.load(inst)));
  $("loading").textContent = "";
  render();
}

/* ---------------------------------------------------------------------- *
 * Chunk-size distribution — log-normal, calibrated to the measured median
 * and p90 from tracker/0000-map.md and CONTEXT.md: chatgpt.com runs small
 * (median ~3 chars) with an occasional long tail; claude.ai runs bigger
 * (median ~33 chars) and narrower. Both converge to p90 ~43. For a
 * log-normal, median = e^mu and p90 = e^(mu + 1.2816*sigma), solved below.
 * ---------------------------------------------------------------------- */
interface SiteProfile {
  label: string;
  rate: number; // chunks/sec
  mu: number;
  sigma: number;
}
function profileFor(median: number, p90: number, rate: number, label: string): SiteProfile {
  const sigma = Math.log(p90 / median) / 1.2816;
  return { label, rate, mu: Math.log(median), sigma };
}
const CLAUDE: SiteProfile = profileFor(33, 43, 4.8, "claude.ai (4.8/s)");
const CHATGPT: SiteProfile = profileFor(3, 43, 6.6, "chatgpt.com (6.6/s)");

/** Seeded RNG (mulberry32) so a replay is honest — same seed, same stream. */
function mulberry32(seed: number): () => number {
  let a = seed | 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function randNormal(rng: () => number): number {
  const u1 = Math.max(1e-9, rng());
  const u2 = rng();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}
function sampleChars(profile: SiteProfile, rng: () => number): number {
  const z = randNormal(rng);
  return Math.max(1, Math.round(Math.exp(profile.mu + profile.sigma * z)));
}

const PROSE =
  "The extension turns a streaming reply into a walk across a pentatonic scale, " +
  "one note per chunk of text, fired the instant it lands. Nothing is smoothed " +
  "or rescheduled, which is exactly what gives the stream a sense of impact. " +
  "The open questions left are all about feel: how long a note should ring, " +
  "how much space it sits in, how loud it lands next to its neighbours, and " +
  "whether the register drifts somewhere unpleasant over a long answer. None " +
  "of that shows up in a spectrum analyzer. It has to be heard.";
const CODE =
  "Here is the observer this relies on. ```js\nconst obs = new MutationObserver((records) => {\n" +
  "  for (const r of records) onGrowth(r);\n});\nobs.observe(root, { childList: true, subtree: true, characterData: true });\n```" +
  " That coalesces every callback with net growth into one Chunk, which is what keeps the rate playable.";
const LONG = (PROSE + " " + CODE + " " + PROSE).repeat(1);

interface PlannedChunk {
  delayMs: number;
  text: string;
  chars: number;
  isCode: boolean;
  endsSentence: boolean;
}

function* wordFeed(text: string): Generator<string> {
  const words = text.split(/(\s+)/).filter((w) => w.length);
  let i = 0;
  for (;;) {
    if (i >= words.length) i = 0;
    yield words[i++]!;
  }
}

/** Chops `text` into chunks whose sizes follow `profile`, looping the text
 * if more chunks are needed than it has words for (endurance mode). */
function planChunks(
  text: string,
  profile: SiteProfile,
  rng: () => number,
  opts: { count?: number; durationSec?: number },
): PlannedChunk[] {
  const feed = wordFeed(text);
  const plan: PlannedChunk[] = [];
  let inCode = false;
  let elapsedMs = 0;
  const gapMs = 1000 / profile.rate;
  const stop = () =>
    opts.count !== undefined ? plan.length >= opts.count : elapsedMs / 1000 >= (opts.durationSec ?? 0);

  while (!stop()) {
    const target = sampleChars(profile, rng);
    let piece = "";
    while (piece.length < target) piece += feed.next().value;
    const fences = (piece.match(/```/g) || []).length;
    const isCode = inCode || fences > 0;
    if (fences % 2 === 1) inCode = !inCode;
    // Jittered gap around the site's mean rate, never below 4ms (measured
    // floor — claude.ai's median inter-callback gap was ~1ms at the mutation
    // level, but Chunks coalesce well above that).
    const delayMs = Math.max(4, gapMs * (0.4 + 1.2 * rng()));
    elapsedMs += delayMs;
    plan.push({
      delayMs,
      text: piece,
      chars: piece.length,
      isCode,
      endsSentence: /[.!?][")\s]*$/.test(piece),
    });
  }
  return plan;
}

/* ---------------------------------------------------------------------- *
 * Stream runner
 * ---------------------------------------------------------------------- */
let timer: ReturnType<typeof setTimeout> | undefined;
let running = false;
let stats = { chunks: 0, startedAt: 0 };

function stopStream(): void {
  clearTimeout(timer);
  timer = undefined;
  running = false;
  render();
}

function feedChunk(pc: PlannedChunk): void {
  const chunk: Chunk = {
    text: pc.text,
    chars: pc.chars,
    isCode: pc.isCode,
    endsSentence: pc.endsSentence,
    at: ctx.currentTime,
  };
  engine.onChunk(chunk);

  // Shadow-track for the overlap readout (real mapChunk/releaseScale, real
  // instrument tuning, same input — just not connected to any audio node).
  const def = currentDef(liveId);
  const st = shadowState.get(liveId)!;
  const { state, notes } = mapChunk(st, chunk, def);
  shadowState.set(liveId, state);
  const release = def.release * releaseScale(chunk.chars);
  for (const _n of notes) activeTails.push({ until: ctx.currentTime + release });

  stats.chunks++;
  appendTranscript(pc);
  say(
    `Chunk ${stats.chunks} — <b>${pc.chars} chars</b>${pc.isCode ? ", code" : ""} · ` +
      `${Math.round(pc.delayMs)}ms gap · degree ${state.degree} · release ${release.toFixed(2)}s`,
  );
}

function runPlan(plan: PlannedChunk[], label: string): void {
  clearTimeout(timer);
  running = true;
  stats = { chunks: 0, startedAt: performance.now() };
  $("transcript").textContent = "";
  say(`<b>${label}</b> starting…`);
  let i = 0;
  const step = () => {
    if (i >= plan.length) return stopStream();
    const pc = plan[i++]!;
    timer = setTimeout(() => {
      feedChunk(pc);
      render();
      step();
    }, pc.delayMs);
  };
  step();
}

function endStream(): void {
  if (!running) return;
  clearTimeout(timer);
  running = false;
  engine.onStreamEnd();
  say("<b>Response complete</b> — closing flourish (the real Engine.onStreamEnd()).");
  render();
}

/**
 * The real engine.onStreamEnd() is the ONLY end-of-stream sound that
 * exists in src/core/engine.ts today — StreamEndReason ("aborted" vs
 * "quiescence"/"signal") is not threaded through to a distinct sound, so an
 * abort currently plays the identical rising flourish as a clean finish.
 * That may be intentional or may be a gap; it's a real, reproducible fact
 * this harness surfaces rather than papers over. This button is wired to
 * the same call so you can judge it, not to a fabricated "abort" sound.
 */
function abortStream(): void {
  if (!running) return;
  clearTimeout(timer);
  running = false;
  engine.onStreamEnd();
  say(
    "<b>Stopped (simulated abort)</b> — note: the real engine has no distinct abort " +
      "sound yet, this plays the same flourish as a clean finish.",
  );
  render();
}

function appendTranscript(pc: PlannedChunk): void {
  const el = $("transcript");
  const span = document.createElement("span");
  if (pc.isCode) span.className = "code";
  span.textContent = pc.text;
  el.appendChild(span);
  el.scrollTop = el.scrollHeight;
}
function say(html: string): void {
  $("lastEvent").innerHTML = html;
}

/* ---------------------------------------------------------------------- *
 * Level check — all six instruments, same synthetic chunk (chars chosen so
 * weight stays well under 0.5 — no octave drop — an apples-to-apples base-
 * register comparison), same fresh mapping state (degree 0, i.e. each
 * instrument's own `base` note), spaced so they don't overlap.
 * ---------------------------------------------------------------------- */
function levelCheck(): void {
  clearTimeout(timer);
  running = false;
  say("<b>Level check</b> — all six, same weight, back to back.");
  const chunk: Chunk = { text: "level-check", chars: 20, isCode: false, endsSentence: false, at: 0 };
  INSTRUMENTS.forEach((inst, i) => {
    setTimeout(() => {
      const def = currentDef(inst.id);
      engine.setInstrument(def);
      liveId = inst.id;
      const { notes } = mapChunk(initMapping(), { ...chunk, at: ctx.currentTime }, def);
      for (const note of notes) sampler.play(note, def, def.release);
      say(`Level check — <b>${inst.label}</b> (gainTrim ${round2(def.gainTrim)})`);
      render();
    }, i * 900);
  });
}

/* ---------------------------------------------------------------------- *
 * UI wiring
 * ---------------------------------------------------------------------- */
function selectInstrument(id: string): void {
  liveId = id;
  engine.setInstrument(currentDef(id));
  document.querySelectorAll<HTMLElement>("[data-inst]").forEach((b) => {
    b.classList.toggle("on", b.dataset.inst === id);
  });
  say(`Voice: <b>${getLabel(id)}</b>${running ? " — switched mid-stream" : ""}`);
  render();
}
function getLabel(id: string): string {
  return INSTRUMENTS.find((i) => i.id === id)!.label;
}

function buildInstrumentPicker(): void {
  const wrap = $("voicePicker");
  INSTRUMENTS.forEach((inst) => {
    const b = document.createElement("button");
    b.dataset.inst = inst.id;
    b.textContent = inst.label;
    b.onclick = () => selectInstrument(inst.id);
    wrap.appendChild(b);
  });
  wrap.querySelector<HTMLElement>(`[data-inst="${liveId}"]`)?.classList.add("on");
}

const SLIDER_SPECS: Array<{ key: keyof Tuning; label: string; min: number; max: number; step: number }> = [
  { key: "registerOffset", label: "Register offset (st)", min: -24, max: 24, step: 1 },
  { key: "release", label: "Release (s)", min: 0.1, max: 3, step: 0.05 },
  { key: "reverb", label: "Reverb send", min: 0, max: 1, step: 0.01 },
  { key: "gainTrim", label: "Gain trim", min: 0, max: 8, step: 0.01 },
];

function buildSliders(): void {
  const wrap = $("sliders");
  INSTRUMENTS.forEach((inst) => {
    const group = document.createElement("div");
    group.className = "instGroup";
    const h = document.createElement("h3");
    h.textContent = inst.label;
    group.appendChild(h);
    SLIDER_SPECS.forEach((spec) => {
      const row = document.createElement("div");
      row.className = "knob";
      const label = document.createElement("label");
      label.textContent = spec.label;
      const input = document.createElement("input");
      input.type = "range";
      input.min = String(spec.min);
      input.max = String(spec.max);
      input.step = String(spec.step);
      input.value = String(tunings.get(inst.id)![spec.key]);
      const readout = document.createElement("span");
      readout.className = "readout";
      readout.textContent = input.value;
      input.oninput = () => {
        const t = tunings.get(inst.id)!;
        t[spec.key] = Number(input.value);
        readout.textContent = input.value;
        if (liveId === inst.id) engine.setInstrument(currentDef(inst.id));
        renderSnippets();
      };
      row.append(label, input, readout);
      group.appendChild(row);
    });
    wrap.appendChild(group);
  });
}

function renderSnippets(): void {
  $("snippets").textContent = INSTRUMENTS.map((i) => snippetFor(i.id)).join("\n");
}

function render(): void {
  const now = running ? ctx.currentTime : 0;
  const active = activeTails.filter((t) => t.until > now).length;
  const rows: Record<string, string> = {
    Voice: getLabel(liveId),
    Stream: running ? "streaming…" : "idle",
    Chunks: String(stats.chunks),
    "Active tails (est.)": String(active),
  };
  $("statePanel").innerHTML = Object.entries(rows)
    .map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`)
    .join("");
  renderSnippets();
}

function buildScenarios(): void {
  const wrap = $("scenarios");
  const rng1 = () => mulberry32(20260819);

  const add = (label: string, fn: () => void) => {
    const b = document.createElement("button");
    b.className = "step";
    b.textContent = label;
    b.onclick = fn;
    wrap.appendChild(b);
  };

  add("Prose @ claude.ai rate (4.8/s)", () =>
    runPlan(planChunks(PROSE, CLAUDE, rng1(), { count: 60 }), "Prose — claude.ai"),
  );
  add("Prose @ chatgpt.com rate (6.6/s)", () =>
    runPlan(planChunks(PROSE, CHATGPT, rng1(), { count: 90 }), "Prose — chatgpt.com"),
  );
  add("Code-block burst (incremental, realistic)", () =>
    runPlan(planChunks(CODE, CHATGPT, rng1(), { count: 40 }), "Code block — incremental"),
  );
  add("Force one heavy flush (rare in practice — tests octave-drop/sub-octave)", () => {
    clearTimeout(timer);
    running = true;
    stats = { chunks: 0, startedAt: performance.now() };
    $("transcript").textContent = "";
    const bigText = LONG.repeat(4).slice(0, 1400);
    feedChunk({ delayMs: 0, text: bigText, chars: bigText.length, isCode: false, endsSentence: true });
    render();
    running = false;
  });
  add("Long answer — endurance (2.5 min @ chatgpt.com rate)", () =>
    runPlan(planChunks(LONG, CHATGPT, rng1(), { durationSec: 150 }), "Long answer — endurance"),
  );
  add("Long answer — endurance (2.5 min @ claude.ai rate)", () =>
    runPlan(planChunks(LONG, CLAUDE, rng1(), { durationSec: 150 }), "Long answer — endurance"),
  );
  add("End stream (closing flourish)", endStream);
  add("Stop now (simulated abort)", abortStream);
  add("Level check — all six, same weight", levelCheck);
}

/* ---------------------------------------------------------------------- */
buildInstrumentPicker();
buildSliders();
buildScenarios();
renderSnippets();
$("unlock").onclick = () => void boot();
