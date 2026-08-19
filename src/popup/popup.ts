import { Sampler } from "../core/sampler";
import { INSTRUMENTS, DEFAULT_INSTRUMENT_ID } from "../instruments";
import type { InstrumentDefinition } from "../core/types";

/**
 * The control surface is a halo.
 *
 * The six voices are lights sitting on a ring, placed by register: the
 * lowest voice at the base of the ring, pitch rising around both sides
 * to the highest at the zenith. Striking a light picks that voice and
 * plays it, and the halo ripples. The heart of the ring turns the sound
 * on and off; muted, the halo goes dark. Everything below the ring is
 * deliberately quiet.
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
 * Where each voice sits on the ring.
 *
 * Sorted by register, the lowest voice takes the base of the ring (90° in
 * screen coordinates) and the rest alternate left and right, climbing both
 * flanks so that pitch rises toward the zenith. The layout is computed from
 * the instruments' base notes, so it stays honest if the roster changes.
 */
function haloLayout(): Array<{ inst: InstrumentDefinition; angleDeg: number }> {
  const byPitch = [...INSTRUMENTS].sort((a, b) => a.base - b.base);
  const step = 360 / Math.max(1, byPitch.length);
  return byPitch.map((inst, i) => ({
    inst,
    angleDeg: 90 + (i % 2 === 1 ? 1 : -1) * Math.ceil(i / 2) * step,
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

function ripple(): void {
  const wave = document.createElement("div");
  wave.className = "ripple";
  wave.addEventListener("animationend", () => wave.remove());
  $("sky").append(wave);
}

function showVoice(inst: InstrumentDefinition, struck: boolean): void {
  const voice = $("voice");
  voice.textContent = inst.label;
  if (!struck) return;
  voice.classList.add("struck");
  void voice.offsetWidth; // let the hot color land before fading back
  voice.classList.remove("struck");
}

const RING_RADIUS = 71; // half the halo's 142px diameter

function renderHalo(): void {
  const sky = $("sky");
  for (const { inst, angleDeg } of haloLayout()) {
    const orb = document.createElement("button");
    orb.className = "orb";
    const a = (angleDeg * Math.PI) / 180;
    orb.style.left = `calc(50% + ${(RING_RADIUS * Math.cos(a)).toFixed(1)}px)`;
    orb.style.top = `calc(50% + ${(RING_RADIUS * Math.sin(a)).toFixed(1)}px)`;
    orb.title = inst.label;
    orb.setAttribute("aria-label", inst.label);
    orb.setAttribute("aria-pressed", String(inst.id === settings.instrument));

    orb.addEventListener("click", () => {
      save({ instrument: inst.id });
      for (const other of sky.querySelectorAll(".orb")) {
        other.setAttribute("aria-pressed", String(other === orb));
      }
      ripple();
      showVoice(inst, true);
      void audition(inst);
    });

    // Hovering previews the name without committing to it.
    orb.addEventListener("pointerenter", () => showVoice(inst, false));
    orb.addEventListener("pointerleave", () => showVoice(selected(), false));

    sky.append(orb);
  }
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
  $("power").setAttribute("aria-pressed", String(!settings.muted));
  document.body.classList.toggle("off", settings.muted);
}

function renderVolume(): void {
  const percent = Math.round(settings.volume * 100);
  const volume = $<HTMLInputElement>("volume");
  volume.value = String(percent);
  volume.style.setProperty("--vol", `${percent}%`);
  $("volume-val").textContent = String(percent);
}

/* --- boot ----------------------------------------------------------------- */

async function main(): Promise<void> {
  settings = (await chrome.storage.sync.get(DEFAULTS)) as Settings;

  renderPower();
  renderVolume();
  renderHalo();
  renderSites();
  showVoice(selected(), false);
  if (!settings.muted) ripple(); // one slow breath as the panel opens

  $("power").addEventListener("click", () => {
    save({ muted: !settings.muted });
    renderPower();
    if (!settings.muted) ripple();
  });

  const volume = $<HTMLInputElement>("volume");
  volume.addEventListener("input", () => {
    const value = Number(volume.value) / 100;
    save({ volume: value });
    volume.style.setProperty("--vol", `${volume.value}%`);
    $("volume-val").textContent = volume.value;
    // Keep an open audition in step, so dragging the slider is audible.
    audio?.master.gain.setTargetAtTime(value, audio.ctx.currentTime, 0.02);
  });

  // Show the shortcut the user actually has, not the suggested default.
  const commands = await chrome.commands.getAll();
  const mute = commands.find((c) => c.name === "toggle-mute");
  if (mute?.shortcut) $("shortcut").textContent = mute.shortcut;
}

void main();
