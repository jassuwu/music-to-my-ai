# Instrument library: samples vs synthesis for the Instrument roster

Research date: 2026-08-15/16. Method: primary-source library repos/sites (GitHub, freepats.zenvoid.org, VCSL, Freesound, Tone.js/smplr source), Chrome extension docs (developer.chrome.com, chromium.org), direct HTTP checks (`curl`) for measured file sizes. University of Iowa's site (`theremin.music.uiowa.edu`) could not be reached directly from this sandbox (DNS failure) — those claims are marked **verified via secondary sources** (multiple independent write-ups quoting the primary site's stated terms), not first-hand.

This builds on the settled decision in [0001](../tracker/tickets/0001-audio-tech-for-mv3-content-scripts.md): raw Web Audio API in the content script, samples preloaded once into `AudioBuffer`s, delivered via `web_accessible_resources` + `chrome.runtime.getURL()` + `fetch()` + `decodeAudioData()`. This research does not re-litigate that; it answers what feeds into it.

---

## 1. Approach: samples vs SoundFont player vs library vs hand synthesis

**Recommendation: bundled, pre-extracted flat sample files + a small hand-rolled sampler (closest-note lookup + `playbackRate` pitch-shift), not a SoundFont parser and not a runtime dependency on smplr/soundfont-player/Tone.js.**

- **Hand-tuned synthesis** was already tried and explicitly rejected by the project for this roster — [0007](../tracker/tickets/0007-voicing-the-direct-mapping.md) states "additive synthesis cannot convincingly produce those instruments," which is what opened this ticket. Kalimba synthesis was judged good enough to be the *default voice*, but guitar/violin/sitar/harmonium/veena were not attempted because plucked/bowed/reed timbres need real excitation-noise and body resonance that oscillator-based synthesis doesn't produce without heavy modal-synthesis work — out of scope for a personal toy.
- **A live SF2/SFZ player** (parsing the binary soundfont format at runtime, e.g. a WASM synth or `@strudel/soundfonts`-style loader) is unnecessary complexity for this project. SoundFonts are built to serve all 128 GM patches + drum kits from one file; this project needs a handful of specific instruments at a handful of pitches each. Verified via source inspection (ticket 0001): Strudel's own soundfont loader (`packages/soundfonts/fontloader.mjs`) uses `eval()` to parse legacy MIDI.js JSON soundfont data — exactly the kind of runtime-parsing complexity and CSP exposure this project doesn't need when the same note audio can be extracted once, offline, into flat files.
- **Existing browser sample libraries** (`smplr`, `soundfont-player`, Tone.js `Sampler`) are valuable as **proven references for technique**, not as runtime dependencies:
  - `smplr` ([danigb/smplr](https://github.com/danigb/smplr), MIT) plays instruments from the Versilian Community Sample Library and Benjamin Gleitzman's pre-rendered GM soundfonts, by default **fetching from a CDN** (`smpldsnds.github.io`) at runtime. That default-fetch design is a bad fit here — see §3.
  - `soundfont-player` ([danigb/soundfont-player](https://github.com/danigb/soundfont-player)) is the same idea, older, same CDN-fetch default.
  - Tone.js `Sampler` ([docs](https://tonejs.github.io/docs/15.1.22/classes/Sampler.html)) is the cleanest reference for the *sparse-sampling* technique this project should use: you pass a sparse `{ note: url }` map, and internally it runs a `_findClosest()` lookup and pitch-shifts via playback rate to fill in unsampled notes — "if you only have every 3rd note on a piano sampled, you could turn that into a full piano sample." That's exactly the one-note-per-octave + `playbackRate` strategy the ticket asks about, and it's a shipped, production-tested pattern — just re-implement the ~30 lines of logic directly on `AudioBufferSourceNode.playbackRate`, per ticket 0001's zero-dependency raw-Web-Audio decision, rather than pulling in Tone.js for it.

**Why not pull in the library anyway:** ticket 0001 already weighed Tone.js (78KB gzip, ~100ms default lookahead, tunable) against raw Web Audio and chose raw Web Audio; nothing about sample playback changes that calculus — `AudioBufferSourceNode` scheduling is identical either way, so the only thing a library would add here is the closest-note/pitch-shift helper, which is small enough to hand-roll and keeps the extension dependency-free.

---

## 2. Assets and licensing

### Clearly usable now (verified primary sources, permissive license, real recorded samples)

| Instrument | Source | License | Notes |
|---|---|---|---|
| Piano | [VCSL](https://github.com/sgossner/VCSL) — "Grand Piano, Steinway B" / "Grand Piano, Kawai" (`Chordophones/Zithers/`) | **CC0** ([LICENSE](https://raw.githubusercontent.com/sgossner/VCSL/master/LICENSE)) | Confirmed via GitHub tree listing + LICENSE file fetch. |
| Harp | VCSL "Concert Harp" / "Folk Harp" (`Chordophones/Composite Chordophones/`), **or** [FreePats Concert Harp](https://freepats.zenvoid.org/OrchestralStrings/harp.html) | **CC0** both | FreePats harp: 2 velocity layers, SFZ+FLAC 4.8MiB (best) / 2.5MiB (small), SF2 4.9–9.1MiB. |
| Kalimba | [FreePats Kalimba](https://freepats.zenvoid.org/Ethnic/kalimba.html) (real recordings, Jan 2019), **or** VCSL "Kalimba, Kenya"/"Kalimba, Tanzania" | **CC0** both | FreePats: SFZ+WAV 10.3MiB, SF2 3.7MiB, round-robin layers. Real recorded kalimba, not synth — an option to *upgrade* the existing default voice, not just fill the roster. |
| Acoustic guitar | [FreePats Nylon-String](https://freepats.zenvoid.org/Guitar/acoustic-guitar.html) / [Steel-String Acoustic Guitar](https://freepats.zenvoid.org/Guitar/steel-acoustic-guitar.html) | **CC0** | Nylon: SFZ+FLAC 4.5MiB, SFZ+WAV 6.9MiB, SF2 9.5MiB. |
| Electric guitar | [FreePats Clean Electric Guitar](https://freepats.zenvoid.org/ElectricGuitar/clean-electric-guitar.html) | **CC0** | Full quality 60–456MiB; a **"small" bridge-pickup-only variant is 2.4–6.3MiB** — FreePats' own answer to "is sparse sampling good enough," already shipped as an explicit reduced tier. |
| Bass | [FreePats Clean Electric Bass](https://freepats.zenvoid.org/ElectricGuitar/clean-electric-bass.html) | **CC0** | Pick and finger variants; SFZ+FLAC 2.7–3.1MiB, SF2 2.2–2.5MiB. |
| Violin (**pizzicato**) | University of Iowa Electronic Music Studios, Musical Instrument Samples database | **Free, no stated restrictions** — **verified via secondary sources only** (multiple independent write-ups — Medium, MacMusic, Cycling'74 forum, rekkerd.org — all describing the same primary-site statement: "freely available... may be downloaded and used for any projects, without restrictions" since 1997); direct fetch of `theremin.music.uiowa.edu` failed from this sandbox (DNS) | Iowa's collection includes both **arco (bowed)** and **pizzicato (plucked)** violin. Use the **pizzicato** set — see §5, bowed violin is flagged as a bad fit for one-shot triggering. |
| Sitar | [FluidR3_GM](https://member.keymusician.com/Member/FluidR3_GM/README.html) or [MusyngKite](https://musical-artifacts.com/artifacts/1883) GM soundfont, "Sitar" patch (GM program 105) — pre-rendered per-note files hosted at [gleitz/midi-js-soundfonts](https://github.com/gleitz/midi-js-soundfonts) (`FluidR3_GM/sitar-mp3.js`) | FluidR3_GM: **MIT** per the original release ([member.keymusician.com](https://member.keymusician.com/Member/FluidR3_GM/README.html)), though the gleitz-hosted repo's own README labels its FluidR3_GM derivative **CC BY 3.0** — a real but minor discrepancy between sources, noted rather than resolved; MusyngKite is **CC BY-SA 3.0** (ShareAlike). | GM's "Ethnic" bank (105–112) happens to cover exactly the plucked/struck instruments general MIDI is usually criticized for lacking: **105 Sitar, 109 Kalimba**. These are real recorded-instrument samples inside the soundfont, not synth patches. **Prefer FluidR3_GM over MusyngKite** to avoid MusyngKite's ShareAlike clause interacting ambiguously with a proprietary extension bundle. Measured (via direct `curl`) — the gleitz-hosted `FluidR3_GM/sitar-mp3.js` (full chromatic range, base64-embedded in JS) is **2.9MB**; a sparse, non-base64 extraction would be far smaller (see §3). |

### Genuine gaps — no bundling-safe source found

| Instrument | What was found | Why it doesn't clear the bar |
|---|---|---|
| **Harmonium** | (a) [Freesound: "Harmonium Samples - All Keys and Drones" by donyaquick](https://freesound.org/people/donyaquick/sounds/330410/), recorded at Yale's Euterpea Studio — **CC0**, but shipped as a single 167MB/96kHz WAV containing all keys and drones together, not split note files — real production work (splitting, trimming, re-encoding) to turn into a usable sample set. (b) [FreePats "Button Accordion HN"](https://freepats.zenvoid.org/Organ/accordion.html) — CC0, small (4.8–5.7MiB) — but it's a Western button accordion, not remotely close to harmonium timbre. | Harmonium's whole character is bellows-driven sustain and drone (§5) — even with a perfect sample source, one-shot triggering is a poor fit. Recommend **not bundling harmonium for v1** rather than shipping a wrong-sounding approximation. |
| **Veena** | Only two candidates found: [Pianobook "Saraswati Veena"](https://www.pianobook.co.uk/packs/saraswati-veena/) (well-recorded, EXS24/Kontakt), and paid Splice packs. | Pianobook's own [Terms & Conditions](https://www.pianobook.co.uk/terms-conditions/) explicitly forbid "resale or other distribution of the Products... reformatted for use in another sampler... in a sampler, microchip, computer or any sample playback device" outside of "mixed into your own original music production" — i.e. **bundling the raw samples inside a redistributed software product is exactly what the license prohibits**. Splice sounds are licensed for use in music you make, not for redistributing the sample files inside another product. No CC0/permissive dedicated veena sample set was found. | Recommend **omitting veena from v1**; it's a sourcing gap, not a mapping-fit problem (veena is plucked, so it would trigger well one-shot if a legally bundlable set existed). Worth a follow-up ticket if this instrument matters enough to justify recording/licensing effort. |

### Note on Pianobook generally

Pianobook's license blocks *any* Pianobook pack from being bundled into this extension's package (same clause as above), regardless of instrument. It's a good source to audition/reference but not to ship from.

---

## 3. Size and delivery

**Recommendation: bundle in the extension package (declared under `web_accessible_resources`, loaded via `chrome.runtime.getURL()` + `fetch()` + `decodeAudioData()`), not fetch-on-demand from an external CDN.**

- MV3 changed cross-origin `fetch()`/XHR behavior for content scripts: per [chromium.org's own security-team writeup](https://www.chromium.org/Home/chromium-security/extension-content-script-fetches/), "content scripts will lose the ability to fetch cross-origin data from origins in their extension's permissions, and they will only be able to fetch data that the underlying page itself has access to" — i.e. a content script's `fetch()` is now gated by **the host page's own CORS/CSP**, not the extension's `host_permissions`. Chrome's own recommended workaround is to do the fetch from the background/extension page and relay the result to the content script via messaging — which reintroduces exactly the two-hop-messaging latency and service-worker cold-start risk that ticket 0001 already ruled out for note-triggering.
- This means fetching sample assets on demand from e.g. `smpldsnds.github.io` or `gleitz.github.io` (as `smplr`/`soundfont-player` do by default) from inside the claude.ai/chatgpt.com content script is now at the mercy of **those sites' own CSP**, an unverified and unstable dependency for something as basic as "can I load a guitar sample." Bundling sidesteps this entirely — `web_accessible_resources` files are served from the extension's own `chrome-extension://` origin via `chrome.runtime.getURL()`, unaffected by the host page's CSP (same mechanism ticket 0001 already validated for the click-sound-effect extension it inspected).
- `web_accessible_resources` in MV3 is an array of `{ resources, matches }` entries — [developer.chrome.com](https://developer.chrome.com/docs/extensions/mv3/manifest/web_accessible_resources) documents no size or count limit on the resources array itself; the practical ceiling is just "reasonable extension package size," and the charter already rules out Chrome Web Store review constraints (personal toy, unpacked load) — so there's no hard technical ceiling to design against, only good sense.

**Realistic per-instrument and total size, using measured numbers above:**
- FreePats' own CC0 packs, in their smallest bundled tier (SFZ+FLAC or the explicit "small" variant), run **~2–10MB per instrument** as shipped (multi-velocity-layer, near-full note range).
- That's already small enough to bundle 6–8 instruments (15–60MB) without concern for a personal, unpacked extension, but it can be cut further:
  - **Sparse sampling (one sample per octave, `playbackRate` pitch-shift to fill gaps) is the right call and is not a novel risk** — it's exactly what Tone.js `Sampler` does internally (§1), and it's exactly what FreePats' own "small" electric-guitar variant does in practice (456MiB full → 2.4–6.3MiB by keeping one pickup position and presumably fewer round robins/velocity layers) — a ~70–100x reduction from their own full sets, self-demonstrating that sparse sampling stays well within "good enough."
  - Combining sparse octave sampling with re-encoding to a compressed format (mp3/opus) and trimming each sample's tail to what a fast one-shot hit actually needs (no need for a 4-second harp decay when hits can arrive 15/sec) should comfortably land **each instrument in the low hundreds of KB to ~1–1.5MB**, and the whole v1 roster (7–8 instruments) in the **single-digit MB total** — this specific per-instrument-after-trimming number is an estimate/inference from the measured FreePats numbers, not itself independently verified, since no one has done this specific extraction yet.
- Practical pipeline: extract needed notes from the CC0 SFZ+WAV/FLAC sources **offline, at build/packaging time** (a one-time script, not runtime SF2 parsing — see §1), re-encode to a small lossy format, and commit the flat per-note files into the extension's `assets/` directory.

---

## 4. Latency and memory

This section is design reasoning grounded in the facts above, not itself sourced from an external doc (no citation needed beyond §1–3's material).

- **Decode once, at content-script init, for every bundled instrument — not lazily per instrument-switch.** With a v1 roster in the single-digit-MB range (§3), decoding all instruments' sparse note sets up front costs at most a few hundred milliseconds of `decodeAudioData()` work, which can run concurrently with the same window ticket 0001 already relies on for the `AudioContext` unlock gesture (the user composing/submitting their first prompt, before any Chunk needs a sound). This guarantees the first Chunk after an instrument switch is never late — the buffers are already resident, switching instrument is just changing which pre-decoded `AudioBuffer` map a note lookup reads from, with no fetch or decode on the switch path at all.
- **Memory cost of holding several instruments decoded is low.** Decoded PCM for a sparse note set (e.g. ~8–12 notes/instrument, ~1s each, 44.1kHz stereo 16-bit ≈ ~350KB/note) across an 8-instrument roster is on the order of tens of MB resident — trivial next to a normal browser tab's footprint, and nowhere near a reason to build an LRU/on-demand-decode scheme for v1. Revisit only if the roster grows much larger than ~10 instruments.

---

## 5. Fit to the Direct mapping (one-shot hits, up to ~15/sec)

The mapping is fixed (ticket 0003): exactly one sound per Chunk, fired on arrival, no smoothing, no legato/sustain-linking between hits. That means every Instrument voice is, structurally, a **one-shot trigger** — attack transient + a bounded decay, never a held note. This fits some instrument families cleanly and actively fights others:

- **Good fit (naturally one-shot instruments):** piano, acoustic/electric guitar, bass, harp, kalimba, sitar (plucked/struck attack, natural decay — this is what these instruments already sound like played as single notes). Veena is in this category too by nature (plucked) — its absence from v1 is a licensing gap, not a mapping-fit problem.
- **Flagged as a bad fit if triggered naively:**
  - **Violin** — the *bowed/arco* character (attack driven by bow speed/pressure, ongoing sustain, ability to swell) is fundamentally a sustain instrument; triggering an arco sample as a one-shot (full sample, or worse, truncated) reads as an abruptly cut-off bow stroke, not a note. **Mitigation used above: source pizzicato violin specifically** (Univ. of Iowa has both) — pizzicato is already a natural one-shot pluck, sidestepping the mismatch entirely rather than fighting it.
  - **Harmonium** — bellows-driven sustain and drone is its entire identity; there's no pizzicato-style natural one-shot equivalent (unlike violin). Even with a perfect sample source, gating a harmonium note to a fast one-shot hit would sound like an accordion stab, not a harmonium. Combined with the licensing gap (§2), the recommendation is to **not force a harmonium voice into v1** rather than ship something that reads as wrong on the first listen.

---

## Recommendation

**Approach:** bundled, offline-extracted flat sample files (sparse: ~1 note/octave) played through a small hand-rolled sampler on top of the already-settled raw Web Audio API — closest-note lookup + `AudioBufferSourceNode.playbackRate` pitch-shift, the same technique Tone.js `Sampler` uses internally, reimplemented in ~30 lines rather than adding a dependency. No SF2/SFZ parsing at runtime, no CDN fetch at runtime (blocked/unreliable under MV3's content-script CORS changes), no per-instrument hand-tuned synthesis (already tried and abandoned for anything but kalimba).

**Sources:** VCSL (CC0) for piano/harp, optionally kalimba; FreePats (CC0) for acoustic guitar, electric guitar, bass, harp, kalimba; University of Iowa Electronic Music Studios (free, unrestricted — pizzicato set specifically) for violin; FluidR3_GM soundfont's "Sitar" GM patch (MIT/CC-BY, prefer over MusyngKite's CC-BY-SA) via gleitz/midi-js-soundfonts, extracted offline rather than fetched at runtime, for sitar.

**Shippable v1 roster (8 instruments, all clear the "as good as a decent kalimba synth" bar because they're real recordings, sparsely sampled and pitch-shifted the same proven way):**
1. Kalimba (default — keep current synth, or upgrade to FreePats/VCSL CC0 real kalimba samples)
2. Piano (VCSL, CC0)
3. Acoustic guitar (FreePats, CC0)
4. Electric guitar (FreePats, CC0)
5. Bass (FreePats, CC0)
6. Harp (FreePats or VCSL, CC0)
7. Violin — **pizzicato** (Univ. of Iowa, free/unrestricted)
8. Sitar (FluidR3_GM GM patch, MIT/CC-BY, extracted offline)

**Deferred, not in v1:** veena (no bundling-safe license found — sourcing gap, not a mapping-fit problem) and harmonium (no good source *and* a poor structural fit for one-shot triggering — both problems, not just one). Worth their own follow-up if either instrument turns out to matter enough to justify recording/licensing effort.

## Sources

- [danigb/smplr](https://github.com/danigb/smplr) — web audio sampler, sample source survey
- [danigb/soundfont-player](https://github.com/danigb/soundfont-player)
- [Tone.js Sampler docs](https://tonejs.github.io/docs/15.1.22/classes/Sampler.html) and `_findClosest`/pitch-shift behavior (via search of GitHub issues/docs)
- [Versilian Community Sample Library (VCSL)](https://github.com/sgossner/VCSL) — GitHub tree listing and [LICENSE](https://raw.githubusercontent.com/sgossner/VCSL/master/LICENSE) fetched directly (CC0)
- [FreePats project](https://freepats.zenvoid.org/) — index and individual instrument pages fetched directly: [kalimba](https://freepats.zenvoid.org/Ethnic/kalimba.html), [acoustic guitar](https://freepats.zenvoid.org/Guitar/acoustic-guitar.html), [electric guitar](https://freepats.zenvoid.org/ElectricGuitar/clean-electric-guitar.html), [electric bass](https://freepats.zenvoid.org/ElectricGuitar/clean-electric-bass.html), [harp](https://freepats.zenvoid.org/OrchestralStrings/harp.html), [accordion](https://freepats.zenvoid.org/Organ/accordion.html)
- [FreePats licenses page](https://freepats.zenvoid.org/licenses.html) — CC0 preference, GPL+exception explanation
- University of Iowa Electronic Music Studios — **not directly reachable from this sandbox**; claims sourced from secondary write-ups: [Medium (Greg Cerveny)](https://gmcerveny.medium.com/musical-instrument-samples-from-university-of-iowa-d04524463b2a), [rekkerd.org](https://rekkerd.org/musical-instrument-samples-from-the-university-of-iowa-electronic-music-studios/), [MacMusic](https://www.macmusic.org/news/view.php/lang/en/id/1592/), [Cycling'74 forum](https://cycling74.com/forums/free-u-of-iowa-anechoic-musical-instrument-samples-mis)
- [gleitz/midi-js-soundfonts](https://github.com/gleitz/midi-js-soundfonts) — pre-rendered FluidR3_GM/MusyngKite per-note files; sizes measured directly via `curl` on `FluidR3_GM/sitar-mp3.js` (2.9MB), `acoustic_guitar_nylon-mp3.js` (1.8MB), `kalimba-mp3.js` (1.6MB), `orchestral_harp-mp3.js` (1.9MB)
- [FluidR3_GM README / license](https://member.keymusician.com/Member/FluidR3_GM/README.html) (MIT)
- General MIDI instrument list (program 105 Sitar, 109 Kalimba) — [Sweetwater](https://www.sweetwater.com/sweetcare/articles/general-midi-patch-lists/) and standard GM references
- [Pianobook Terms & Conditions](https://www.pianobook.co.uk/terms-conditions/) — redistribution/bundling restriction that rules out Pianobook packs (including [Saraswati Veena](https://www.pianobook.co.uk/packs/saraswati-veena/)) for this project
- [Freesound: Harmonium Samples — All Keys and Drones, by donyaquick](https://freesound.org/people/donyaquick/sounds/330410/) (CC0, unsplit multi-key WAV)
- [Chrome for Developers: `web_accessible_resources`](https://developer.chrome.com/docs/extensions/mv3/manifest/web_accessible_resources)
- [chromium.org: Changes to Cross-Origin Requests in Chrome Extension Content Scripts](https://www.chromium.org/Home/chromium-security/extension-content-script-fetches/) — content-script `fetch()` now gated by the host page's own CORS, not extension `host_permissions`
- [../../tracker/tickets/0001-audio-tech-for-mv3-content-scripts.md](../../tracker/tickets/0001-audio-tech-for-mv3-content-scripts.md) and its research file — settled raw-Web-Audio decision and `web_accessible_resources`/`chrome.runtime.getURL()` pattern this ticket builds on
