---
id: 14
title: Popup, settings and mute shortcut
labels: [wayfinder:task]
status: closed
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

## Implementation note

Landed: master switch, volume slider (defaulting to 60%, and it steers an open audition live so dragging is audible), instrument grid of all 8 auditioning a three-note phrase on select, per-site toggles, and the mute shortcut read from `chrome.commands.getAll()` so the footer shows the shortcut the user actually has rather than the suggested default. Settings persist to `chrome.storage.sync`; content scripts already react to changes. Disabling mutes the controls visually rather than hiding them. **Open pending a look.**

## Resolution

Verified: the controls work and the simplicity is right. Master switch, volume at 60%, the 8-instrument grid auditioning a three-note phrase on select, per-site toggles, and the real mute shortcut read from Chrome rather than the suggested default. Settings persist to `chrome.storage.sync` and content scripts pick up changes live.

**One gap, and it is not a control problem.** The panel reads as configuration UI rather than as something that makes sound. It needs character while staying this simple. That is a separate design question, now [Visual identity](0016-visual-identity.md).
