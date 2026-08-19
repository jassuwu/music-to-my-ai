import { Sampler } from "../core/sampler";
import { INSTRUMENTS, DEFAULT_INSTRUMENT_ID } from "../instruments";
import type { InstrumentDefinition } from "../core/types";

/**
 * The control surface is a kalimba you can strike.
 *
 * The voice picker is not a list of options — it is a comb of six tines, one
 * per instrument, laid out the way a real kalimba is: the longest (lowest)
 * tine in the middle, shorter ones alternating outward. Striking a tine picks
 * that voice and plays it. Everything else on the panel is deliberately small,
 * because the comb is the instrument and the rest is just settings.
 */

interface Settings {
  muted: boolean;
  volume: number;
  instrument: string;
  sites: Record<string, boolean>;
}

const DEFAULTS: Settings = {
  muted: false,
  volume: 0.6,
  instrument: DEFAULT_INSTRUMENT_ID,
  sites: { claude: true, chatgpt: true },
};

const SITES: Array<{ id: string; label: string }> = [
  { id: "claude", label: "claude.ai" },
  { id: "chatgpt", label: "chatgpt.com" },
];

const $ = <T extends HTMLElement>(id: string): T =>
  document.getElementById(id) as T;

let settings: Settings = DEFAULTS;

const save = (patch: Partial<Settings>): void => {
  settings = { ...settings, ...patch };
  void chrome.storage.sync.set(patch);
};

/**
 * Tine order and length, arranged like a real kalimba.
 *
 * Length follows the instrument's register — bass is the longest tine, harp
 * the shortest — and the lowest sits in the centre with the rest alternating
 * outward, which is what gives a kalimba its arch. So the comb is not
 * decoration: it is a picture of the roster's pitch range.
 */
function combLayout(): Array<{ inst: InstrumentDefinition; height: number }> {
  const byPitch = [...INSTRUMENTS].sort((a, b) => a.base - b.base);

  const arranged: InstrumentDefinition[] = [];
  byPitch.forEach((inst, i) => {
    // lowest to the middle, then alternate right and left
    if (i % 2 === 0) arranged.push(inst);
    else arranged.unshift(inst);
  });

  const lowest = byPitch[0]?.base ?? 40;
  const highest = byPitch[byPitch.length - 1]?.base ?? 72;
  const span = Math.max(1, highest - lowest);

  return arranged.map((inst) => ({
    inst,
    // 100% for the lowest note down to 46% for the highest
    height: 100 - ((inst.base - lowest) / span) * 54,
  }));
}

/* --- audition ------------------------------------------------------------ */

let audio: { ctx: AudioContext; sampler: Sampler; master: GainNode } | undefined;

async function audition(inst: InstrumentDefinition): Promise<void> {
  // The popup exists because the toolbar icon was clicked, so a gesture has
  // already happened and the context starts running.
  if (!audio) {
    const ctx = new AudioContext();
    const master = ctx.createGain();
    master.gain.value = settings.volume;
    master.connect(ctx.destination);
    audio = { ctx, sampler: new Sampler(ctx, master), master };
  }

  const { ctx, sampler } = audio;
  await sampler.load(inst);

  // Three notes, not one: a single note says too little to choose by.
  [0, 2, 4].forEach((degree, i) => {
    const step = inst.scale[degree % inst.scale.length] ?? 0;
    sampler.play(
      {
        atSec: ctx.currentTime + i * 0.13,
        midi: inst.base + step,
        gain: inst.gainTrim * 0.6,
        bright: 1,
      },
      inst,
      inst.release,
    );
  });
}

/* --- rendering ------------------------------------------------------------ */

function showVoice(inst: InstrumentDefinition, flash: boolean): void {
  const voice = $("voice");
  voice.textContent = inst.label;
  const position = INSTRUMENTS.indexOf(inst) + 1;
  $("index").textContent =
    `${String(position).padStart(2, "0")}/${String(INSTRUMENTS.length).padStart(2, "0")}`;

  if (!flash) return;
  voice.classList.remove("flash");
  void voice.offsetWidth; // restart the animation
  voice.classList.add("flash");
}

function renderComb(): void {
  const comb = $("comb");
  comb.replaceChildren(
    ...combLayout().map(({ inst, height }) => {
      const tine = document.createElement("button");
      tine.className = "tine";
      tine.style.height = `${height}%`;
      tine.title = inst.label;
      tine.setAttribute("aria-label", inst.label);
      tine.setAttribute("aria-pressed", String(inst.id === settings.instrument));

      tine.addEventListener("click", () => {
        save({ instrument: inst.id });
        for (const other of comb.children) {
          other.setAttribute(
            "aria-pressed",
            String(other === tine),
          );
        }
        tine.classList.remove("struck");
        void tine.offsetWidth;
        tine.classList.add("struck");
        showVoice(inst, true);
        void audition(inst);
      });

      // Hovering previews the name without committing to it.
      tine.addEventListener("pointerenter", () => showVoice(inst, false));
      tine.addEventListener("pointerleave", () => showVoice(selected(), false));

      return tine;
    }),
  );
}

const selected = (): InstrumentDefinition =>
  INSTRUMENTS.find((i) => i.id === settings.instrument) ?? INSTRUMENTS[0]!;

function renderSites(): void {
  $("sites").replaceChildren(
    ...SITES.map(({ id, label }) => {
      const button = document.createElement("button");
      button.className = "site";
      button.setAttribute("aria-pressed", String(settings.sites[id] !== false));

      const lamp = document.createElement("span");
      lamp.className = "lamp";
      const name = document.createElement("span");
      name.textContent = label;
      button.append(lamp, name);

      button.addEventListener("click", () => {
        const next = settings.sites[id] === false;
        save({ sites: { ...settings.sites, [id]: next } });
        button.setAttribute("aria-pressed", String(next));
      });
      return button;
    }),
  );
}

function renderPower(): void {
  $<HTMLInputElement>("power").checked = !settings.muted;
  document.body.classList.toggle("off", settings.muted);
}

function renderVolume(): void {
  const percent = Math.round(settings.volume * 100);
  $<HTMLInputElement>("volume").value = String(percent);
  $("volume-val").textContent = String(percent);
}

/* --- boot ----------------------------------------------------------------- */

async function main(): Promise<void> {
  settings = (await chrome.storage.sync.get(DEFAULTS)) as Settings;

  renderPower();
  renderVolume();
  renderComb();
  renderSites();
  showVoice(selected(), false);

  $<HTMLInputElement>("power").addEventListener("change", (e) => {
    save({ muted: !(e.target as HTMLInputElement).checked });
    renderPower();
  });

  const volume = $<HTMLInputElement>("volume");
  volume.addEventListener("input", () => {
    const value = Number(volume.value) / 100;
    save({ volume: value });
    $("volume-val").textContent = volume.value;
    // Keep an open audition in step, so dragging the fader is audible.
    audio?.master.gain.setTargetAtTime(value, audio.ctx.currentTime, 0.02);
  });

  // Show the shortcut the user actually has, not the suggested default.
  const commands = await chrome.commands.getAll();
  const mute = commands.find((c) => c.name === "toggle-mute");
  if (mute?.shortcut) $("shortcut").textContent = mute.shortcut;
}

void main();
