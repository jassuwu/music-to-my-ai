---
id: 7
title: Voicing the Direct mapping
labels: [wayfinder:prototype]
status: closed
assignee: jass
blocked-by: []
---

## Question

The mapping structure is settled — one sound per Chunk, fired on arrival, no smoothing ([Sound-mapping prototype](0003-sound-mapping-prototype.md)). Its **character** is not: the current triangle-wave pluck was judged "fine, but should feel nicer — more soothing, and maybe upbeat".

Build a second prototype that holds the Direct structure fixed and varies only the voice, so candidates can be A/B'd by ear on identical seeded streams. Vary along:

- **Timbre and envelope** — soft sine/marimba/kalimba/music-box/glass, attack and decay length, subtle detune. What makes a hit read as warm rather than beepy?
- **Register and scale** — where the pitches sit, and whether major/lydian-flavoured degrees read as "upbeat" against the current minor pentatonic. What drives pitch per chunk (size, hash, walk, or near-constant with slight variation)?
- **Space** — reverb/delay amount; how much tail soothes before it turns to mush on fast streams.
- **Dynamics** — velocity variation, whether repeated fast hits should duck or thin out to stay pleasant.
- **Endings** — the closing flourish and the abort sound, revoiced to match (absorbs the map's old "end-of-response and error sounds" fog).

Success test is the fatigue test, not the first impression: the winner is the one still pleasant on the tenth response of the day. Resolved when the user has heard the variants and picked one voice — plus any parameters worth exposing later.

## Resolution

Heard in [../../prototypes/voicing-prototype.html](../../prototypes/voicing-prototype.html) (Direct structure held fixed, seeded streams, six voices plus scale/register/reverb/pitch knobs).

**Kalimba is the default voice**, at the settings it was auditioned with: major pentatonic, transpose 0, reverb 0.32, gentle-walk pitch driver, burst-thinning on, attack 0.004s / decay 0.62s. Pitch should visibly *move* between hits — "like a piano with various notes" — so the gentle walk stays; the almost-still driver is not the default.

**Scope change: the instrument becomes user-selectable.** No single voice is the whole product — the ask is a roster of recognisable real instruments (piano, electric and acoustic guitar, bass, violin, sitar, veena, harmonium, harp, and similar) with a pleasant default rather than a blank choice. This is *not* a revival of the dead Sound Pack idea: the Mapping stays Direct and unswappable; only the Instrument changes. Every voice in the prototype was judged acceptable, so the bar is "pleasant", not "uniquely correct".

Consequences: the prototype's additive synthesis cannot produce those instruments convincingly, which opens [Instrument library: samples or synthesis](0008-instrument-library.md). Volume must be adjustable with a pleasant default, which goes to [Control surface](0004-sound-packs-and-control-surface.md) along with the instrument picker.
