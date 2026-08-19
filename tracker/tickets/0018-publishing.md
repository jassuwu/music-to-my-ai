---
id: 18
title: Publishing — a landing page and a zip
labels: [wayfinder:build]
status: open
assignee: jass
blocked-by: []
---

## Question

v1 works and the repo is public. Getting it into someone else's browser needs a page to point at and a file to hand them. What is the smallest version of each that does not cost a second toolchain?

## Decisions

**No Chrome Web Store.** A developer account costs $5 and this is a toy; jass killed it outright. Distribution is a zip on a GitHub release, which is one `bun run package` and one `gh release create`. The cost is honest and worth naming: everyone who installs this has to turn on developer mode, and there are no automatic updates. Revisit only if strangers actually start asking for it.

**The zip is one command.** `bun run package` builds `dist/` and zips it from the inside out, so `manifest.json` sits at the zip root, which is what Chrome's "load unpacked" needs. Source maps and icon SVGs are excluded: `dist/` keeps both for local work, neither belongs in a download. Output is `release/music-to-my-ai-<version>.zip`, 0.86 MB, gitignored.

**Version is 1.0.0.** 0.1.0 was a working number for a folder loaded unpacked by one person. A release has a number other people quote back at you.

**The landing page is one HTML file and one bundled script**, in `site/`, built to `dist-site/` by `bun run site`. It imports `src/core/*` and `src/instruments` unmodified, so the demo on the page is the shipped engine rather than a recording. A fake reply streams at claude.ai's measured 4.8 chunks/sec through the real mapping and sampler; the voice picker is the real roster; samples load only when a voice is chosen. Its one link-preview image is the icon mark on ink (`assets/promo.png`), generated from the icon rather than designed separately.

**No monorepo tooling.** Same reasoning as [Extension scaffolding](0005-extension-scaffolding-decisions.md): one `package.json`, one dependency-free `Bun.build` call per output, three build scripts over one `src/`. Turborepo caches and orders a graph of interdependent packages, and there is no graph here. A workspace boundary between `site/` and `src/` is exactly what would let the demo drift from the extension it advertises.

**Vercel hosts it, at music-to-my-ai.jass.gg.** `vercel.json` pins the inputs (bun install, `bun run site`, `dist-site`, no framework preset) so the dashboard and the repo cannot disagree, plus a year-long immutable cache on `/samples/*`, which are content-addressed by name and never change. GitHub Pages was built first and thrown away: it wanted a workflow file, and the repo's own push token has no `workflow` scope.

## Open

- The subdomain's DNS record is jass's to add.
- The page's install link points at `/releases/latest`, so the first release has to exist before that link works.
- A demo video for twitter is parked. The page is the demo.
