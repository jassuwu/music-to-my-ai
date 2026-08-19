import { createUnlockedContext } from "./core/unlock";
import { Sampler } from "./core/sampler";
import { Engine } from "./core/engine";
import { adapterFor } from "./adapters";
import { DEFAULT_INSTRUMENT_ID, getInstrument } from "./instruments";

/**
 * Content-script entry point. Finds the adapter for this site, wires it to the
 * engine, and keeps both in step with the user's settings.
 */

const LOG = "[music-to-my-agents]";

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
  sites: { claude: true, chatgpt: true },
};

async function main(): Promise<void> {
  const adapter = adapterFor(location.href);
  if (!adapter) return;

  const settings = (await chrome.storage.sync.get(DEFAULTS)) as Settings;

  const { ctx, ready } = createUnlockedContext();
  const master = ctx.createGain();
  master.gain.value = 0;
  master.connect(ctx.destination);

  const sampler = new Sampler(ctx, master);
  let instrument = getInstrument(settings.instrument);

  const engine = new Engine(ctx, sampler, instrument, master);
  engine.start();

  const applyVolume = (s: Settings) => {
    const enabled = s.sites[adapter.id] !== false && !s.muted;
    engine.setVolume(enabled ? s.volume : 0);
  };

  // Audio cannot start before a real gesture; the user's own click or Enter to
  // submit a prompt supplies it well before any text streams back. If none ever
  // arrives we simply stay silent — no banner, no nag.
  void ready.then(async () => {
    await sampler.load(instrument);
    applyVolume(settings);
    console.log(`${LOG} ready — ${instrument.label} on ${adapter.id}`);
  });

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
    applyVolume(settings);
  });

  adapter.start(
    {
      onChunk: (chunk) => engine.onChunk(chunk),
      onStreamEnd: () => engine.onStreamEnd(),
    },
    () => ctx.currentTime,
  );

  console.log(`${LOG} watching ${location.hostname} via ${adapter.id} adapter`);
}

void main();
