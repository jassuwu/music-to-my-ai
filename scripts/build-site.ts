/**
 * Builds the landing page into docs/.
 *
 * Same recipe as the extension build, because it is the same problem: one
 * self-contained IIFE, unhashed filenames, static assets copied beside it. No
 * second toolchain, no workspace, no monorepo — the page imports the extension's
 * own modules straight out of src/, so a change to the engine changes the demo
 * with it and there is nothing to keep in sync.
 *
 *   bun run site
 */
import { rm, mkdir, cp } from "node:fs/promises";

const OUT = "docs";

await rm(OUT, { recursive: true, force: true });
await mkdir(OUT, { recursive: true });

const result = await Bun.build({
  entrypoints: ["site/demo.ts"],
  outdir: OUT,
  target: "browser",
  format: "iife",
  naming: "[name].js",
  minify: true,
});

if (!result.success) {
  for (const log of result.logs) console.error(log);
  process.exit(1);
}

await cp("site/index.html", `${OUT}/index.html`);
await cp("assets/icons", `${OUT}/icons`, { recursive: true });
// Every voice, because the picker offers every voice. They are fetched only
// when one is chosen, so the page still starts on ~40 KB of kalimba.
await cp("assets/samples", `${OUT}/samples`, { recursive: true });
// The link preview image, reused from the store tile.
await cp("store/promo-1400x560.png", `${OUT}/promo.png`);

console.log(`built -> ${OUT}/  (serve it: bunx serve docs)`);
