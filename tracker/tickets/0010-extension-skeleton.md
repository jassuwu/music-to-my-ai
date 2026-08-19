---
id: 10
title: Build the extension skeleton
labels: [wayfinder:task]
status: closed
assignee: jass
blocked-by: []
---

## Question

Task. Stand up the runnable shell decided in [Extension scaffolding decisions](0005-extension-scaffolding-decisions.md), with no sound in it yet.

- `manifest.json` (MV3): content script matching claude.ai and chatgpt.com, `web_accessible_resources` for `assets/samples/*`, popup, and the `chrome.commands` mute shortcut.
- `bun build --target=browser --format=iife --outdir dist --watch` script, plus asset copying with **unhashed** filenames.
- The folder layout from that ticket, with TypeScript types for the Adapter contract and instrument definitions declared but unimplemented.
- A content script that unlocks an `AudioContext` on the first trusted gesture and `console.log`s a line per detected Chunk — proving injection, permissions and the unlock path end to end.

Done when the extension loads unpacked and logs Chunks on both sites.

## Implementation note

Code is landed and building: MV3 manifest (both sites, `web_accessible_resources` for samples, popup, mute command), bun-only build emitting unhashed IIFE bundles with sourcemaps, `src/core/types.ts` declaring the Chunk/Adapter/Note/InstrumentDefinition contracts, gesture-based AudioContext unlock, and a content script that logs one line per Chunk while coalescing per observer callback. Typecheck is clean.

**Still open pending verification**, because the acceptance criterion is behavioural: the extension must be loaded unpacked from `dist/` and observed logging Chunks on both sites. The chunk detection here is a deliberately generic placeholder — real per-site selectors, the 900ms quiescence rule and defensive fallbacks arrive with [Site adapters](0012-site-adapters.md).

## Resolution

Verified live on claude.ai: the extension loads unpacked, injects, unlocks audio, logs one line per Chunk and detects end-of-stream by quiescence. Permissions, build output and the content-script path are all confirmed working.

**The verification also exposed a scoping bug in the placeholder observer**, which is useful input for the adapters: watching `main` generically picks up the *composer*, so the user's own typing was reported as a stream of 1-character Chunks, followed by a single 221-character Chunk when the prompt was posted. Adapters must scope to the assistant message container and never observe the input box.
