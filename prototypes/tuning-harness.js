(() => {
  // src/core/mapping.ts
  var initMapping = () => ({
    degree: 0,
    count: 0,
    last: -99
  });
  function hash(str, salt) {
    let h = 2166136261 ^ salt;
    for (let i = 0;i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return (h >>> 0) / 4294967296;
  }
  function degreeToMidi(degree, inst) {
    const scale = inst.scale;
    const n = scale.length;
    const octave = Math.floor(degree / n);
    const step = scale[(degree % n + n) % n] ?? 0;
    return inst.base + step + 12 * octave;
  }
  function nearestSampleDistance(midi, inst) {
    let best = Infinity;
    for (const key of Object.keys(inst.samples)) {
      const distance = Math.abs(Number(key) - midi);
      if (distance < best)
        best = distance;
    }
    return best;
  }
  var SAMPLE_SHIFT_BUDGET = 5;
  function weightOf(chars) {
    const w = Math.log10(Math.max(1, chars) / 8) / Math.log10(100);
    return Math.min(1, Math.max(0, w));
  }
  function mapChunk(state, chunk, inst) {
    const up = hash(chunk.text, state.count) > 0.44;
    const degree = Math.max(0, Math.min(13, state.degree + (up ? 1 : -1)));
    const weight = weightOf(chunk.chars);
    const undropped = degreeToMidi(degree, inst);
    let drop = 0;
    if (weight > 0.5) {
      const dropped = undropped - 12;
      const wasFine = nearestSampleDistance(undropped, inst) <= SAMPLE_SHIFT_BUDGET;
      const staysFine = nearestSampleDistance(dropped, inst) <= SAMPLE_SHIFT_BUDGET;
      if (staysFine || !wasFine)
        drop = -12;
    }
    const midi = undropped + drop;
    let gain = inst.gainTrim * (0.85 + 0.5 * weight);
    const gap = chunk.at - state.last;
    if (gap < 0.09)
      gain *= 0.5;
    else if (gap < 0.18)
      gain *= 0.75;
    if (chunk.endsSentence)
      gain *= 1.15;
    const notes = [
      {
        atSec: chunk.at,
        midi,
        gain,
        bright: (chunk.isCode ? 1.6 : 1) + 0.6 * weight
      }
    ];
    if (weight > 0.8) {
      const subMidi = midi - 12;
      const midiFine = nearestSampleDistance(midi, inst) <= SAMPLE_SHIFT_BUDGET;
      const subFine = nearestSampleDistance(subMidi, inst) <= SAMPLE_SHIFT_BUDGET;
      if (subFine || !midiFine) {
        notes.push({
          atSec: chunk.at,
          midi: subMidi,
          gain: gain * 0.55,
          bright: 1
        });
      }
    }
    return {
      state: { degree, count: state.count + 1, last: chunk.at },
      notes
    };
  }
  var releaseScale = (chars) => 1 + 1.2 * weightOf(chars);

  // src/core/sampler.ts
  class Sampler {
    ctx;
    master;
    buffers = new Map;
    dry;
    verbSend;
    constructor(ctx, master) {
      this.ctx = ctx;
      this.master = master;
      const limiter = ctx.createDynamicsCompressor();
      limiter.threshold.value = -6;
      limiter.knee.value = 3;
      limiter.ratio.value = 12;
      limiter.attack.value = 0.002;
      limiter.release.value = 0.15;
      limiter.connect(master);
      this.dry = ctx.createGain();
      this.dry.connect(limiter);
      const verb = ctx.createConvolver();
      const len = Math.floor(ctx.sampleRate * 2.2);
      const buf = ctx.createBuffer(2, len, ctx.sampleRate);
      for (let ch = 0;ch < 2; ch++) {
        const data = buf.getChannelData(ch);
        for (let i = 0;i < len; i++) {
          data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6);
        }
      }
      verb.buffer = buf;
      this.verbSend = ctx.createGain();
      this.verbSend.connect(verb);
      verb.connect(limiter);
    }
    async load(inst) {
      if (this.buffers.has(inst.id))
        return;
      const notes = new Map;
      await Promise.all(Object.entries(inst.samples).map(async ([midi, path]) => {
        try {
          const res = await fetch(chrome.runtime.getURL(path));
          const decoded = await this.ctx.decodeAudioData(await res.arrayBuffer());
          notes.set(Number(midi), decoded);
        } catch {}
      }));
      this.buffers.set(inst.id, notes);
    }
    closest(inst, midi) {
      const notes = this.buffers.get(inst.id);
      if (!notes || notes.size === 0)
        return;
      let best;
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
    play(note, inst, release) {
      const sampled = this.closest(inst, note.midi);
      if (sampled === undefined)
        return;
      const buffer = this.buffers.get(inst.id)?.get(sampled);
      if (!buffer)
        return;
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

  // src/core/engine.ts
  var LOOKAHEAD_SEC = 0.12;
  var TICK_MS = 25;

  class Engine {
    ctx;
    sampler;
    master;
    state = initMapping();
    queue = [];
    timer;
    instrument;
    constructor(ctx, sampler, instrument, master) {
      this.ctx = ctx;
      this.sampler = sampler;
      this.master = master;
      this.instrument = instrument;
    }
    start() {
      this.timer ??= setInterval(() => this.drain(), TICK_MS);
    }
    stop() {
      clearInterval(this.timer);
      this.timer = undefined;
      this.queue = [];
    }
    setInstrument(inst) {
      this.instrument = inst;
    }
    setVolume(volume) {
      this.master.gain.setTargetAtTime(volume, this.ctx.currentTime, 0.02);
    }
    onChunk(chunk) {
      const { state, notes } = mapChunk(this.state, chunk, this.instrument);
      this.state = state;
      const release = this.instrument.release * releaseScale(chunk.chars);
      for (const note of notes)
        this.queue.push({ note, release });
    }
    onStreamEnd() {
      const base = this.state.degree;
      for (let i = 0;i < 3; i++) {
        this.queue.push({
          note: {
            atSec: this.ctx.currentTime + i * 0.09,
            midi: this.instrument.base + (this.instrument.scale[i] ?? 0) + 12,
            gain: this.instrument.gainTrim * (0.5 - i * 0.08),
            bright: 1.2
          },
          release: this.instrument.release
        });
      }
      this.state = { ...initMapping(), degree: base };
    }
    drain() {
      const horizon = this.ctx.currentTime + LOOKAHEAD_SEC;
      const due = this.queue.filter((q) => q.note.atSec < horizon);
      this.queue = this.queue.filter((q) => q.note.atSec >= horizon);
      for (const { note, release } of due) {
        this.sampler.play(note, this.instrument, release);
      }
    }
  }

  // src/core/unlock.ts
  function whenUnlocked() {
    if (navigator.userActivation?.hasBeenActive) {
      return Promise.resolve(new AudioContext);
    }
    return new Promise((resolve) => {
      const events = ["pointerdown", "keydown"];
      const unlock = () => {
        for (const type of events)
          document.removeEventListener(type, unlock, true);
        resolve(new AudioContext);
      };
      for (const type of events) {
        document.addEventListener(type, unlock, true);
      }
    });
  }

  // src/instruments/index.ts
  var MAJOR_PENT = [0, 2, 4, 7, 9];
  var SOURCE = "gleitz/midi-js-soundfonts (pre-rendered FluidR3_GM), sparse 2-per-octave extraction";
  var LICENCE = "FluidR3_GM: MIT (hosting repo labels its derivative CC BY 3.0)";
  var SAMPLED_NOTES = [36, 43, 48, 55, 60, 67, 72, 79, 84];
  function samples(id) {
    return Object.fromEntries(SAMPLED_NOTES.map((midi) => [midi, `samples/${id}/${midi}.mp3`]));
  }
  function define(id, label, tuning) {
    return {
      id,
      label,
      samples: samples(id),
      scale: MAJOR_PENT,
      source: SOURCE,
      licence: LICENCE,
      ...tuning
    };
  }
  var INSTRUMENTS = [
    define("kalimba", "Kalimba", { base: 69, reverb: 0.32, release: 0.9, gainTrim: 3.1 }),
    define("piano", "Piano", { base: 60, reverb: 0.25, release: 1.1, gainTrim: 2.19 }),
    define("acoustic-guitar", "Acoustic guitar", { base: 57, reverb: 0.22, release: 1, gainTrim: 1.99 }),
    define("bass", "Bass", { base: 40, reverb: 0.18, release: 0.9, gainTrim: 0.72 }),
    define("harp", "Harp", { base: 72, reverb: 0.45, release: 1.4, gainTrim: 5.86 }),
    define("sitar", "Sitar", { base: 62, reverb: 0.35, release: 1.3, gainTrim: 2.44 })
  ];
  var DEFAULT_INSTRUMENT_ID = "kalimba";

  // prototypes/tuning-harness.ts
  globalThis.chrome = {
    runtime: {
      getURL: (path) => `../assets/${path}`
    }
  };
  var $ = (id) => document.getElementById(id);
  var tunings = new Map(INSTRUMENTS.map((inst) => [
    inst.id,
    { release: inst.release, reverb: inst.reverb, gainTrim: inst.gainTrim, registerOffset: 0 }
  ]));
  function currentDef(id) {
    const base = INSTRUMENTS.find((i) => i.id === id);
    const t = tunings.get(id);
    return {
      ...base,
      release: t.release,
      reverb: t.reverb,
      gainTrim: t.gainTrim,
      base: base.base + t.registerOffset
    };
  }
  function snippetFor(id) {
    const d = currentDef(id);
    const label = INSTRUMENTS.find((i) => i.id === id).label;
    return `define("${id}", "${label}", ` + `{ base: ${d.base}, reverb: ${d.reverb.toFixed(2)}, ` + `release: ${round2(d.release)}, gainTrim: ${round2(d.gainTrim)} }),`;
  }
  var round2 = (n) => Math.round(n * 100) / 100;
  var ctx;
  var master;
  var sampler;
  var engine;
  var liveId = DEFAULT_INSTRUMENT_ID;
  var shadowState = new Map(INSTRUMENTS.map((i) => [i.id, initMapping()]));
  var activeTails = [];
  async function boot() {
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
  function profileFor(median, p90, rate, label) {
    const sigma = Math.log(p90 / median) / 1.2816;
    return { label, rate, mu: Math.log(median), sigma };
  }
  var CLAUDE = profileFor(33, 43, 4.8, "claude.ai (4.8/s)");
  var CHATGPT = profileFor(3, 43, 6.6, "chatgpt.com (6.6/s)");
  function mulberry32(seed) {
    let a = seed | 0;
    return () => {
      a = a + 1831565813 | 0;
      let t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  function randNormal(rng) {
    const u1 = Math.max(0.000000001, rng());
    const u2 = rng();
    return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  }
  function sampleChars(profile, rng) {
    const z = randNormal(rng);
    return Math.max(1, Math.round(Math.exp(profile.mu + profile.sigma * z)));
  }
  var PROSE = "The extension turns a streaming reply into a walk across a pentatonic scale, " + "one note per chunk of text, fired the instant it lands. Nothing is smoothed " + "or rescheduled, which is exactly what gives the stream a sense of impact. " + "The open questions left are all about feel: how long a note should ring, " + "how much space it sits in, how loud it lands next to its neighbours, and " + "whether the register drifts somewhere unpleasant over a long answer. None " + "of that shows up in a spectrum analyzer. It has to be heard.";
  var CODE = "Here is the observer this relies on. ```js\nconst obs = new MutationObserver((records) => {\n" + "  for (const r of records) onGrowth(r);\n});\nobs.observe(root, { childList: true, subtree: true, characterData: true });\n```" + " That coalesces every callback with net growth into one Chunk, which is what keeps the rate playable.";
  var LONG = (PROSE + " " + CODE + " " + PROSE).repeat(1);
  function* wordFeed(text) {
    const words = text.split(/(\s+)/).filter((w) => w.length);
    let i = 0;
    for (;; ) {
      if (i >= words.length)
        i = 0;
      yield words[i++];
    }
  }
  function planChunks(text, profile, rng, opts) {
    const feed = wordFeed(text);
    const plan = [];
    let inCode = false;
    let elapsedMs = 0;
    const gapMs = 1000 / profile.rate;
    const stop = () => opts.count !== undefined ? plan.length >= opts.count : elapsedMs / 1000 >= (opts.durationSec ?? 0);
    while (!stop()) {
      const target = sampleChars(profile, rng);
      let piece = "";
      while (piece.length < target)
        piece += feed.next().value;
      const fences = (piece.match(/```/g) || []).length;
      const isCode = inCode || fences > 0;
      if (fences % 2 === 1)
        inCode = !inCode;
      const delayMs = Math.max(4, gapMs * (0.4 + 1.2 * rng()));
      elapsedMs += delayMs;
      plan.push({
        delayMs,
        text: piece,
        chars: piece.length,
        isCode,
        endsSentence: /[.!?][")\s]*$/.test(piece)
      });
    }
    return plan;
  }
  var timer;
  var running = false;
  var stats = { chunks: 0, startedAt: 0 };
  function stopStream() {
    clearTimeout(timer);
    timer = undefined;
    running = false;
    render();
  }
  function feedChunk(pc) {
    const chunk = {
      text: pc.text,
      chars: pc.chars,
      isCode: pc.isCode,
      endsSentence: pc.endsSentence,
      at: ctx.currentTime
    };
    engine.onChunk(chunk);
    const def = currentDef(liveId);
    const st = shadowState.get(liveId);
    const { state, notes } = mapChunk(st, chunk, def);
    shadowState.set(liveId, state);
    const release = def.release * releaseScale(chunk.chars);
    for (const _n of notes)
      activeTails.push({ until: ctx.currentTime + release });
    stats.chunks++;
    appendTranscript(pc);
    say(`Chunk ${stats.chunks} — <b>${pc.chars} chars</b>${pc.isCode ? ", code" : ""} · ` + `${Math.round(pc.delayMs)}ms gap · degree ${state.degree} · release ${release.toFixed(2)}s`);
  }
  function runPlan(plan, label) {
    clearTimeout(timer);
    running = true;
    stats = { chunks: 0, startedAt: performance.now() };
    $("transcript").textContent = "";
    say(`<b>${label}</b> starting…`);
    let i = 0;
    const step = () => {
      if (i >= plan.length)
        return stopStream();
      const pc = plan[i++];
      timer = setTimeout(() => {
        feedChunk(pc);
        render();
        step();
      }, pc.delayMs);
    };
    step();
  }
  function endStream() {
    if (!running)
      return;
    clearTimeout(timer);
    running = false;
    engine.onStreamEnd();
    say("<b>Response complete</b> — closing flourish (the real Engine.onStreamEnd()).");
    render();
  }
  function abortStream() {
    if (!running)
      return;
    clearTimeout(timer);
    running = false;
    engine.onStreamEnd();
    say("<b>Stopped (simulated abort)</b> — note: the real engine has no distinct abort " + "sound yet, this plays the same flourish as a clean finish.");
    render();
  }
  function appendTranscript(pc) {
    const el = $("transcript");
    const span = document.createElement("span");
    if (pc.isCode)
      span.className = "code";
    span.textContent = pc.text;
    el.appendChild(span);
    el.scrollTop = el.scrollHeight;
  }
  function say(html) {
    $("lastEvent").innerHTML = html;
  }
  function levelCheck() {
    clearTimeout(timer);
    running = false;
    say("<b>Level check</b> — all six, same weight, back to back.");
    const chunk = { text: "level-check", chars: 20, isCode: false, endsSentence: false, at: 0 };
    INSTRUMENTS.forEach((inst, i) => {
      setTimeout(() => {
        const def = currentDef(inst.id);
        engine.setInstrument(def);
        liveId = inst.id;
        const { notes } = mapChunk(initMapping(), { ...chunk, at: ctx.currentTime }, def);
        for (const note of notes)
          sampler.play(note, def, def.release);
        say(`Level check — <b>${inst.label}</b> (gainTrim ${round2(def.gainTrim)})`);
        render();
      }, i * 900);
    });
  }
  function selectInstrument(id) {
    liveId = id;
    engine.setInstrument(currentDef(id));
    document.querySelectorAll("[data-inst]").forEach((b) => {
      b.classList.toggle("on", b.dataset.inst === id);
    });
    say(`Voice: <b>${getLabel(id)}</b>${running ? " — switched mid-stream" : ""}`);
    render();
  }
  function getLabel(id) {
    return INSTRUMENTS.find((i) => i.id === id).label;
  }
  function buildInstrumentPicker() {
    const wrap = $("voicePicker");
    INSTRUMENTS.forEach((inst) => {
      const b = document.createElement("button");
      b.dataset.inst = inst.id;
      b.textContent = inst.label;
      b.onclick = () => selectInstrument(inst.id);
      wrap.appendChild(b);
    });
    wrap.querySelector(`[data-inst="${liveId}"]`)?.classList.add("on");
  }
  var SLIDER_SPECS = [
    { key: "registerOffset", label: "Register offset (st)", min: -24, max: 24, step: 1 },
    { key: "release", label: "Release (s)", min: 0.1, max: 3, step: 0.05 },
    { key: "reverb", label: "Reverb send", min: 0, max: 1, step: 0.01 },
    { key: "gainTrim", label: "Gain trim", min: 0, max: 8, step: 0.01 }
  ];
  function buildSliders() {
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
        input.value = String(tunings.get(inst.id)[spec.key]);
        const readout = document.createElement("span");
        readout.className = "readout";
        readout.textContent = input.value;
        input.oninput = () => {
          const t = tunings.get(inst.id);
          t[spec.key] = Number(input.value);
          readout.textContent = input.value;
          if (liveId === inst.id)
            engine.setInstrument(currentDef(inst.id));
          renderSnippets();
        };
        row.append(label, input, readout);
        group.appendChild(row);
      });
      wrap.appendChild(group);
    });
  }
  function renderSnippets() {
    $("snippets").textContent = INSTRUMENTS.map((i) => snippetFor(i.id)).join(`
`);
  }
  function render() {
    const now = running ? ctx.currentTime : 0;
    const active = activeTails.filter((t) => t.until > now).length;
    const rows = {
      Voice: getLabel(liveId),
      Stream: running ? "streaming…" : "idle",
      Chunks: String(stats.chunks),
      "Active tails (est.)": String(active)
    };
    $("statePanel").innerHTML = Object.entries(rows).map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join("");
    renderSnippets();
  }
  function buildScenarios() {
    const wrap = $("scenarios");
    const rng1 = () => mulberry32(20260819);
    const add = (label, fn) => {
      const b = document.createElement("button");
      b.className = "step";
      b.textContent = label;
      b.onclick = fn;
      wrap.appendChild(b);
    };
    add("Prose @ claude.ai rate (4.8/s)", () => runPlan(planChunks(PROSE, CLAUDE, rng1(), { count: 60 }), "Prose — claude.ai"));
    add("Prose @ chatgpt.com rate (6.6/s)", () => runPlan(planChunks(PROSE, CHATGPT, rng1(), { count: 90 }), "Prose — chatgpt.com"));
    add("Code-block burst (incremental, realistic)", () => runPlan(planChunks(CODE, CHATGPT, rng1(), { count: 40 }), "Code block — incremental"));
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
    add("Long answer — endurance (2.5 min @ chatgpt.com rate)", () => runPlan(planChunks(LONG, CHATGPT, rng1(), { durationSec: 150 }), "Long answer — endurance"));
    add("Long answer — endurance (2.5 min @ claude.ai rate)", () => runPlan(planChunks(LONG, CLAUDE, rng1(), { durationSec: 150 }), "Long answer — endurance"));
    add("End stream (closing flourish)", endStream);
    add("Stop now (simulated abort)", abortStream);
    add("Level check — all six, same weight", levelCheck);
  }
  buildInstrumentPicker();
  buildSliders();
  buildScenarios();
  renderSnippets();
  $("unlock").onclick = () => void boot();
})();

//# debugId=C7CA460C6D1835EB64756E2164756E21
//# sourceMappingURL=tuning-harness.js.map
