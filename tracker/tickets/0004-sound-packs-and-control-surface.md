---
id: 4
title: Control surface
labels: [wayfinder:grilling]
status: closed
assignee: jass
blocked-by: [7]
---

## Question

Rescoped after [Sound-mapping prototype](0003-sound-mapping-prototype.md): Direct is the only mapping and the alternatives were discarded, so there is no pack picker and no Sound Pack abstraction to design. What remains is the user's controls:

- **Instrument picker** — [Voicing the Direct mapping](0007-voicing-the-direct-mapping.md) made the Instrument user-selectable, so this is now the main control. How it presents (list, grid, preview-on-hover), whether switching auditions a note immediately, and how it behaves mid-stream.
- On/off, per-site enable, and **volume** — which must have a pleasant default, not just a slider parked at 100%.
- Whether any voice parameter beyond instrument (register, reverb, pitch movement) is exposed at all, or stays a tuned constant per instrument.
- Where that UI lives: toolbar popup vs in-page control vs nothing but a keyboard shortcut.
- How the AudioContext unlock gesture is worked into the flow, given the user's own prompt-submit click normally supplies it — and what happens on the edge case where it does not (page loaded mid-stream, response resumed on reload).
- Whether settings persist across sessions, and where.

## Resolution

**Toolbar popup only — no in-page UI at all**, plus a `chrome.commands` keyboard shortcut for instant mute. The only control ever needed urgently is "stop the sound now", and a shortcut serves that without injecting anything into claude.ai or chatgpt.com, which would fight their layout and break on redesign. This also keeps the extension out of the DOM it is observing.

**Instrument picker auditions on select**: choosing an instrument immediately plays a short 3-note phrase in that voice (not a single note — one note says too little). The whole product was chosen by ear across two prototypes; the picker works the same way. Audition on *hover* was rejected as accidental noise.

**Volume is a single slider defaulting to ~60%**, never 100% — the first response after install sets the impression, and too loud reads as broken. Each instrument additionally carries a baked-in **gain trim** so the roster is level with itself; that is tuning, not a user control.

**Per-site toggle, both sites on by default.** Global on/off plus one toggle per site, so it can run on claude.ai while silent on chatgpt.com. Off-by-default was rejected: a personal toy is installed *because* the sound is wanted.

**Nothing beyond instrument is exposed.** Register, reverb, pitch movement and burst-thinning stay tuned constants per instrument. Those knobs existed to help *us* find the sound; shipping them makes every user redo that work, and most combinations are worse than the default (reverb at 100% on a fast stream is mud).

**Settings persist in `chrome.storage.sync`** so they follow the Chrome profile.

**No-gesture edge case: stay silent, show nothing.** If a page is reloaded mid-stream or resumes a response before any click, audio simply does not start until the first real gesture — which arrives as soon as the user types. A "click to enable sound" banner was rejected as a nag for a rare, self-healing case that would reintroduce the page injection avoided above.
