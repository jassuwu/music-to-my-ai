import { Sampler } from "../core/sampler";
import { INSTRUMENTS, DEFAULT_INSTRUMENT_ID } from "../instruments";
import type { InstrumentDefinition } from "../core/types";

/**
 * The control surface is nothing.
 *
 * Four styled identities in a row read as costumes, so this one is native
 * controls in the system font, styled by the browser for both themes. The
 * only non-default behavior is functional: picking a voice plays it.
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

/* --- boot ----------------------------------------------------------------- */

const labelledInput = (
  type: "radio" | "checkbox",
  name: string,
  text: string,
  checked: boolean,
  onChange: (input: HTMLInputElement) => void,
): HTMLLabelElement => {
  const label = document.createElement("label");
  const input = document.createElement("input");
  input.type = type;
  input.name = name;
  input.checked = checked;
  input.addEventListener("change", () => onChange(input));
  label.append(input, text);
  return label;
};

async function main(): Promise<void> {
  settings = (await chrome.storage.sync.get(DEFAULTS)) as Settings;

  $("voices").replaceChildren(
    ...INSTRUMENTS.map((inst) =>
      labelledInput("radio", "voice", inst.label, inst.id === settings.instrument, () => {
        save({ instrument: inst.id });
        void audition(inst);
      }),
    ),
  );

  $("sites").replaceChildren(
    ...SITES.map(({ id, label }) =>
      labelledInput("checkbox", id, label, settings.sites[id] !== false, (input) => {
        save({ sites: { ...settings.sites, [id]: input.checked } });
      }),
    ),
  );

  const volume = $<HTMLInputElement>("volume");
  volume.value = String(Math.round(settings.volume * 100));
  volume.addEventListener("input", () => {
    const value = Number(volume.value) / 100;
    save({ volume: value });
    // Keep an open audition in step, so dragging the slider is audible.
    audio?.master.gain.setTargetAtTime(value, audio.ctx.currentTime, 0.02);
  });

  const mute = $<HTMLInputElement>("mute");
  mute.checked = settings.muted;
  mute.addEventListener("change", () => save({ muted: mute.checked }));

  // Show the shortcut the user actually has, not the suggested default.
  const commands = await chrome.commands.getAll();
  const toggle = commands.find((c) => c.name === "toggle-mute");
  if (toggle?.shortcut) $("shortcut").textContent = toggle.shortcut;
}

void main();
