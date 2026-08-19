---
id: 18
title: Publishing — web store and a landing page
labels: [wayfinder:build]
status: open
assignee: jass
blocked-by: []
---

## Question

v1 works and the repo is public. Getting it into someone else's browser needs two things this repo did not have: a Chrome Web Store submission, and a page to point at. What is the smallest version of each that does not cost a second toolchain?

## Decisions

**The store package is one command.** `bun run package` builds `dist/` and zips it from the inside out, so `manifest.json` sits at the zip root where the store requires it. Source maps and icon SVGs are excluded: `dist/` keeps both for local work, and neither is something a reviewer should have to ask about. Output is `release/music-to-my-ai-<version>.zip`, 0.86 MB, gitignored.

**Version is 1.0.0.** 0.1.0 was a working number for a folder loaded unpacked. The store's version is the one users see, and updates are rejected unless it increases.

**Every listing field is written down rather than improvised at submission time**, in `store/listing.md`: name, summary, description, category, single-purpose statement, one justification per permission, and the data-usage answers (nothing collected, so no privacy policy URL is required). The host-permission justification is the one a human reads, because 13 match patterns is what draws a manual review.

**Promo tiles are generated from the mark**, not designed separately: `store/promo-440x280.png` and `promo-1400x560.png` are the lime icon tile on ink with the name in system mono. Screenshots are the only asset a person has to make, since they have to be the real popup on a real page.

**The landing page is one HTML file and one bundled script, in `site/`, built to `docs/` by `bun run site`.** It imports `src/core/*` and `src/instruments` unmodified, so the demo on the page is the shipped engine rather than a recording. A fake reply streams at claude.ai's measured 4.8 chunks/sec through the real mapping and sampler; the voice picker is the real roster; samples load only when a voice is chosen.

**No monorepo tooling.** Same reasoning as [Extension scaffolding](0005-extension-scaffolding-decisions.md): one `package.json`, one dependency-free `Bun.build` call per output, three build scripts that share `src/`. Turborepo exists to cache and order a graph of interdependent packages, and there is no graph here — two artifacts, one source tree, sub-second builds. Workspaces would mean a package boundary between `site/` and `src/`, which is exactly the thing that makes the demo drift from the extension.

**Pages deploys from CI, not from a committed folder.** `.github/workflows/pages.yml` builds and publishes on push to main, so `docs/` stays gitignored and no built binary (1.1 MB of samples) is duplicated into git history.

## Open

- Screenshots, the store account ($5, one time), and the submission itself are jass's to do; the walkthrough is in `store/listing.md`.
- The `install` link on the landing page points at the repo until the store item is live. One href.
- A demo video for twitter is deliberately parked. The page is the demo for now.
