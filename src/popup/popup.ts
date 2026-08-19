import { Sampler } from "../core/sampler";
import { INSTRUMENTS, DEFAULT_INSTRUMENT_ID } from "../instruments";
import type { InstrumentDefinition } from "../core/types";

/**
 * The control surface is an iPod.
 *
 * Nothing here is invented: the click wheel already solved this control
 * set in 2004. Previous/next step through the six voices, play/pause is
 * mute (the LCD backlight goes off), dragging around the wheel is volume
 * exactly as the original scroll wheel was, MENU flips the screen to the
 * voices list, and the status bar counts "3 of 6". The screen is a Now
 * Playing view where the "artist" line is the two sites.
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

const selected = (): InstrumentDefinition =>
  INSTRUMENTS.find((i) => i.id === settings.instrument) ?? INSTRUMENTS[0]!;

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

/* --- the screen ----------------------------------------------------------- */

let view: "now" | "list" = "now";
let volumeLabelTimer: ReturnType<typeof setTimeout> | undefined;

function renderStatus(): void {
  const position = INSTRUMENTS.indexOf(selected()) + 1;
  $("status-left").textContent = settings.muted
    ? "⏸︎"
    : `${position} of ${INSTRUMENTS.length}`;
  if (!volumeLabelTimer) {
    $("status-title").textContent = view === "list" ? "Voices" : "Now Playing";
  }
}

function renderNow(): void {
  $("track").textContent = selected().label;
  $("volfill").style.width = `${Math.round(settings.volume * 100)}%`;
  $("wheel").setAttribute("aria-valuenow", String(Math.round(settings.volume * 100)));
  renderStatus();
}

function renderSites(): void {
  const line = $("sites");
  line.replaceChildren();
  SITES.forEach(({ id, label }, i) => {
    if (i > 0) {
      const sep = document.createElement("span");
      sep.className = "sep";
      sep.textContent = " · ";
      line.append(sep);
    }
    const button = document.createElement("button");
    button.className = "site";
    button.textContent = label;
    button.title = `Play on ${label}`;
    button.setAttribute("aria-pressed", String(settings.sites[id] !== false));
    button.addEventListener("click", () => {
      const next = settings.sites[id] === false;
      save({ sites: { ...settings.sites, [id]: next } });
      button.setAttribute("aria-pressed", String(next));
    });
    line.append(button);
  });
}

function renderList(): void {
  $("view-list").replaceChildren(
    ...INSTRUMENTS.map((inst) => {
      const row = document.createElement("button");
      row.className = "row";
      const name = document.createElement("span");
      name.textContent = inst.label;
      const check = document.createElement("span");
      check.className = "check";
      check.textContent = inst.id === settings.instrument ? "✓" : "";
      row.append(name, check);
      row.addEventListener("click", () => {
        save({ instrument: inst.id });
        void audition(inst);
        setView("now");
      });
      return row;
    }),
  );
}

function setView(next: "now" | "list"): void {
  view = next;
  $("view-now").hidden = next !== "now";
  $("view-list").hidden = next !== "list";
  if (next === "list") renderList();
  else renderNow();
  renderStatus();
}

function renderBacklight(): void {
  document.body.classList.toggle("off", settings.muted);
  renderStatus();
}

/* --- choosing a voice ------------------------------------------------------ */

function stepVoice(direction: 1 | -1): void {
  const index = INSTRUMENTS.indexOf(selected());
  const next =
    INSTRUMENTS[(index + direction + INSTRUMENTS.length) % INSTRUMENTS.length]!;
  save({ instrument: next.id });
  if (view === "list") renderList();
  else renderNow();
  renderStatus();
  void audition(next);
}

/* --- the wheel is the volume ---------------------------------------------- */

function showVolumeLabel(): void {
  $("status-title").textContent = "Volume";
  if (volumeLabelTimer) clearTimeout(volumeLabelTimer);
  volumeLabelTimer = setTimeout(() => {
    volumeLabelTimer = undefined;
    renderStatus();
  }, 900);
}

function nudgeVolume(delta: number, commit: boolean): void {
  settings.volume = Math.min(1, Math.max(0, settings.volume + delta));
  renderNow();
  showVolumeLabel();
  audio?.master.gain.setTargetAtTime(
    settings.volume,
    audio.ctx.currentTime,
    0.02,
  );
  if (commit) save({ volume: settings.volume });
}

function wireWheel(): void {
  const wheel = $("wheel");
  let lastAngle: number | undefined;

  const angleAt = (e: PointerEvent): number => {
    const box = wheel.getBoundingClientRect();
    return Math.atan2(
      e.clientY - (box.top + box.height / 2),
      e.clientX - (box.left + box.width / 2),
    );
  };

  wheel.addEventListener("pointerdown", (e) => {
    if (e.target !== wheel) return; // buttons on the wheel keep their jobs
    wheel.setPointerCapture(e.pointerId);
    lastAngle = angleAt(e);
  });
  wheel.addEventListener("pointermove", (e) => {
    if (lastAngle === undefined) return;
    const angle = angleAt(e);
    let delta = angle - lastAngle;
    if (delta > Math.PI) delta -= 2 * Math.PI;
    if (delta < -Math.PI) delta += 2 * Math.PI;
    lastAngle = angle;
    // one full turn of the wheel sweeps the whole range, like the original
    nudgeVolume(delta / (2 * Math.PI), false);
  });
  const release = (): void => {
    if (lastAngle === undefined) return;
    lastAngle = undefined;
    save({ volume: settings.volume });
  };
  wheel.addEventListener("pointerup", release);
  wheel.addEventListener("pointercancel", release);

  wheel.addEventListener("keydown", (e) => {
    if (e.key === "ArrowUp" || e.key === "ArrowRight") nudgeVolume(0.02, true);
    else if (e.key === "ArrowDown" || e.key === "ArrowLeft") nudgeVolume(-0.02, true);
    else return;
    e.preventDefault();
  });
}

/* --- boot ----------------------------------------------------------------- */

async function main(): Promise<void> {
  settings = (await chrome.storage.sync.get(DEFAULTS)) as Settings;

  renderSites();
  renderNow();
  renderBacklight();
  wireWheel();

  $("btn-prev").addEventListener("click", () => stepVoice(-1));
  $("btn-next").addEventListener("click", () => stepVoice(1));
  $("btn-center").addEventListener("click", () => void audition(selected()));
  $("btn-pause").addEventListener("click", () => {
    save({ muted: !settings.muted });
    renderBacklight();
  });
  $("btn-menu").addEventListener("click", () =>
    setView(view === "list" ? "now" : "list"),
  );

  // Show the shortcut the user actually has, not the suggested default.
  const commands = await chrome.commands.getAll();
  const mute = commands.find((c) => c.name === "toggle-mute");
  if (mute?.shortcut) $("shortcut").textContent = mute.shortcut;
}

void main();
