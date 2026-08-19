---
id: 14
title: Popup, settings and mute shortcut
labels: [wayfinder:task]
status: open
assignee: jass
blocked-by: [10]
---

## Question

Task. Build the control surface exactly as settled in [Control surface](0004-sound-packs-and-control-surface.md) — toolbar popup only, no in-page UI.

- Instrument picker that **auditions a 3-note phrase on select**.
- Volume slider defaulting to **~60%**.
- Global on/off plus a per-site toggle, both sites on by default.
- Persist to `chrome.storage.sync`; content scripts react to changes live.
- `chrome.commands` mute shortcut.
- Expose nothing else — register, reverb, pitch movement and burst-thinning stay baked-in constants.
