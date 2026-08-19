---
id: 5
title: Extension scaffolding decisions
labels: [wayfinder:grilling]
status: closed
assignee: jass
blocked-by: [1]
---

## Question

With the audio-tech facts in hand (Audio tech for MV3 content scripts), settle the scaffolding: bundler and dev loop (e.g. Vite + CRXJS vs WXT vs no-build), TypeScript or not, and repo layout — in particular how per-site Adapters and Sound Packs are organized so both stay pluggable. Small decision session; ends with the repo skeleton agreed (not necessarily built).

## Resolution

**Bun only — no Vite, no WXT, no CRXJS, no plugins.** An extension is not a frontend app: Chrome loads a folder from disk, so there is no dev server, the real entry point is `manifest.json`, the content script must be a single self-contained IIFE (it cannot `import` a hashed chunk), asset filenames must stay literal because `chrome.runtime.getURL('samples/kalimba-a3.wav')` is a string, and HMR does not meaningfully reach a content script running inside claude.ai. Papering over exactly those four things is the reason WXT and CRXJS exist — and `bun build --target=browser --format=iife --outdir dist --watch` (bun 1.3.14, already installed) covers all four with a hand-written manifest and no dependencies.

**Vite+ was considered and rejected** (`vite-plus@0.2.9`, MIT, ships `vp`/`oxlint`/`oxfmt`/vitest, verified on npm 2026-08-16): it is a toolchain layer for lint/format/test/task orchestration across a repo. It solves none of the four extension-specific problems, is at 0.2.x, and duplicates what bun already provides for a single-package personal toy.

**TypeScript**, run natively by bun — zero extra build step. The Adapter contract and instrument configs are where bugs will live, and the live-DOM ticket only existed because nobody could state what a Chunk was.

**Layout** — grouped by role, so the two things added repeatedly (a site, an instrument) each have an obvious home:

```
manifest.json
src/content.ts        # injected entry
src/core/             # mapping, scheduler, sampler — pure, no chrome APIs
src/adapters/         # claude.ts, chatgpt.ts + registry
src/instruments/      # 8 definitions + tuning constants
src/popup/            # control surface
assets/samples/       # stable filenames, copied verbatim
scripts/extract-samples.ts
```

**Dev loop:** `bun build --watch` plus a manual reload in `chrome://extensions`. A websocket auto-reloader is ~40 lines but is a moving part that breaks; add it only if the manual click becomes annoying.

**Git:** initialised, small commits as work lands. Sample extraction ships as *both* a committed script and the committed extracted samples — single-digit MB is nothing for git, and re-downloading from upstream rots (exactly the failure that knocked veena out of the roster).

**Known deviation:** commits are unsigned. The configured hardware signing key (ED25519-SK) requires a physical touch that cannot be given non-interactively. Re-sign with `git rebase --root --exec 'git commit --amend -S --no-edit'` if desired.
