---
id: 10
title: Build the extension skeleton
labels: [wayfinder:task]
status: open
assignee:
blocked-by: []
---

## Question

Task. Stand up the runnable shell decided in [Extension scaffolding decisions](0005-extension-scaffolding-decisions.md), with no sound in it yet.

- `manifest.json` (MV3): content script matching claude.ai and chatgpt.com, `web_accessible_resources` for `assets/samples/*`, popup, and the `chrome.commands` mute shortcut.
- `bun build --target=browser --format=iife --outdir dist --watch` script, plus asset copying with **unhashed** filenames.
- The folder layout from that ticket, with TypeScript types for the Adapter contract and instrument definitions declared but unimplemented.
- A content script that unlocks an `AudioContext` on the first trusted gesture and `console.log`s a line per detected Chunk — proving injection, permissions and the unlock path end to end.

Done when the extension loads unpacked and logs Chunks on both sites.
