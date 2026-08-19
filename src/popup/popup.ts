import { Sampler } from "../core/sampler";
import { INSTRUMENTS, DEFAULT_INSTRUMENT_ID } from "../instruments";
import type { InstrumentDefinition } from "../core/types";

/**
 * The whole control surface. Deliberately small: the instrument picker is the
 * main control, and nothing beyond it, volume and the site toggles is exposed —
 * register, reverb, pitch movement and burst-thinning stay tuned constants.
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

/* --- audition ------------------------------------------------------------ */

let audio: { ctx: AudioContext; sampler: Sampler; master: GainNode } | undefined;

/**
 * Picking an instrument plays a short phrase in that voice. Three notes rather
 * than one: a single note says too little to choose by.
 */
async function audition(inst: InstrumentDefinition): Promise<void> {
  // The popup only exists because the user clicked the toolbar icon, so a
  // gesture has already happened and the context starts running.
  if (!audio) {
    const ctx = new AudioContext();
    const master = ctx.createGain();
    master.gain.value = settings.volume;
    master.connect(ctx.destination);
    audio = { ctx, sampler: new Sampler(ctx, master), master };
  }

  const { ctx, sampler } = audio;
  await sampler.load(inst);

  const degrees = [0, 2, 4];
  degrees.forEach((degree, i) => {
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

/* --- rendering ----------------------------------------------------------- */

function renderInstruments(): void {
  const host = $("instruments");
  host.replaceChildren(
    ...INSTRUMENTS.map((inst) => {
      const button = document.createElement("button");
      button.className = "inst";
      button.textContent = inst.label;
      button.setAttribute("aria-pressed", String(inst.id === settings.instrument));
      button.title = inst.label;
      button.addEventListener("click", () => {
        save({ instrument: inst.id });
        renderInstruments();
        void audition(inst);
      });
      return button;
    }),
  );
}

function renderSites(): void {
  const host = $("sites");
  host.replaceChildren(
    ...SITES.map(({ id, label }) => {
      const row = document.createElement("div");
      row.className = "site";

      const name = document.createElement("label");
      name.textContent = label;
      name.htmlFor = `site-${id}`;

      const toggle = document.createElement("span");
      toggle.className = "switch";
      const input = document.createElement("input");
      input.type = "checkbox";
      input.id = `site-${id}`;
      input.checked = settings.sites[id] !== false;
      input.addEventListener("change", () => {
        save({ sites: { ...settings.sites, [id]: input.checked } });
      });
      const track = document.createElement("span");
      track.className = "track";
      toggle.append(input, track);

      row.append(name, toggle);
      return row;
    }),
  );
}

function renderPower(): void {
  const power = $<HTMLInputElement>("power");
  power.checked = !settings.muted;
  document.body.classList.toggle("off", settings.muted);
}

function renderVolume(): void {
  $<HTMLInputElement>("volume").value = String(Math.round(settings.volume * 100));
  $("volume-val").textContent = `${Math.round(settings.volume * 100)}%`;
}

/* --- boot ---------------------------------------------------------------- */

async function main(): Promise<void> {
  settings = (await chrome.storage.sync.get(DEFAULTS)) as Settings;

  renderPower();
  renderVolume();
  renderInstruments();
  renderSites();

  $<HTMLInputElement>("power").addEventListener("change", (e) => {
    save({ muted: !(e.target as HTMLInputElement).checked });
    renderPower();
  });

  const volume = $<HTMLInputElement>("volume");
  volume.addEventListener("input", () => {
    const value = Number(volume.value) / 100;
    save({ volume: value });
    $("volume-val").textContent = `${volume.value}%`;
    // Keep an open audition in step, so dragging the slider is audible.
    audio?.master.gain.setTargetAtTime(value, audio.ctx.currentTime, 0.02);
  });

  // Show the shortcut the user actually has, which may differ from the default.
  const commands = await chrome.commands.getAll();
  const mute = commands.find((c) => c.name === "toggle-mute");
  if (mute?.shortcut) $("shortcut").textContent = mute.shortcut;
}

void main();
