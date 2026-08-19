import { whenUnlocked } from "./core/unlock";
import { Sampler } from "./core/sampler";
import { Engine } from "./core/engine";
import { adapterFor } from "./adapters";
import { DEFAULT_SITES } from "./sites";
import { DEFAULT_INSTRUMENT_ID, getInstrument } from "./instruments";

/**
 * Content-script entry point. Finds the adapter for this site, wires it to the
 * engine, and keeps both in step with the user's settings.
 */

const LOG = "[music-to-my-ai]";

interface Settings {
  muted: boolean;
  volume: number;
  instrument: string;
  sites: Record<string, boolean>;
}

const DEFAULTS: Settings = {
  muted: false,
  // Never 100%: the first response after install sets the impression.
  volume: 0.6,
  instrument: DEFAULT_INSTRUMENT_ID,
  sites: DEFAULT_SITES,
};

async function main(): Promise<void> {
  const adapter = adapterFor(location.href);
  if (!adapter) return;

  const settings = (await chrome.storage.sync.get(DEFAULTS)) as Settings;
  console.log(`${LOG} armed on ${location.hostname} — click or type to start audio`);

  // Everything audio-related waits for the gesture, so nothing is constructed
  // that Chrome would complain about.
  const ctx = await whenUnlocked();

  const master = ctx.createGain();
  master.gain.value = 0;
  master.connect(ctx.destination);

  const sampler = new Sampler(ctx, master);
  let instrument = getInstrument(settings.instrument);

  const engine = new Engine(ctx, sampler, instrument, master);
  engine.start();

  const applyVolume = () => {
    const enabled = settings.sites[adapter.id] !== false && !settings.muted;
    engine.setVolume(enabled ? settings.volume : 0);
  };

  await sampler.load(instrument);
  applyVolume();

  chrome.storage.onChanged.addListener((changes) => {
    if (changes.muted) settings.muted = changes.muted.newValue as boolean;
    if (changes.volume) settings.volume = changes.volume.newValue as number;
    if (changes.sites) settings.sites = changes.sites.newValue as Settings["sites"];
    if (changes.instrument) {
      settings.instrument = changes.instrument.newValue as string;
      instrument = getInstrument(settings.instrument);
      engine.setInstrument(instrument);
      void sampler.load(instrument);
    }
    applyVolume();
  });

  adapter.start(
    {
      onChunk: (chunk) => engine.onChunk(chunk),
      onStreamEnd: () => engine.onStreamEnd(),
    },
    () => ctx.currentTime,
  );

  console.log(`${LOG} ready — ${instrument.label} on ${adapter.id}`);
}

void main().catch((error: unknown) => {
  // Reloading the extension at chrome://extensions orphans the content
  // scripts already injected into open tabs; their next chrome.* call throws
  // "Extension context invalidated". The orphan is dead either way — the
  // reloaded extension injects a fresh script — so die quietly, not loudly.
  if (String(error).includes("Extension context invalidated")) return;
  throw error;
});
