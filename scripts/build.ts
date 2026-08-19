/**
 * Build. No bundler framework — an extension is a folder of files, and
 * `Bun.build` covers the four things that actually matter here: a single
 * self-contained IIFE per entry (content scripts cannot import chunks),
 * unhashed filenames (chrome.runtime.getURL takes literal strings),
 * static asset copying, and a watch loop.
 *
 *   bun run build     one shot
 *   bun run dev       rebuild on change
 */
import { rm, mkdir, cp } from "node:fs/promises";
import { existsSync } from "node:fs";

const OUT = "dist";

await rm(OUT, { recursive: true, force: true });
await mkdir(OUT, { recursive: true });

const result = await Bun.build({
  entrypoints: ["src/content.ts", "src/background.ts", "src/popup/popup.ts"],
  outdir: OUT,
  target: "browser",
  format: "iife",
  naming: "[name].js",
  sourcemap: "linked",
});

if (!result.success) {
  for (const log of result.logs) console.error(log);
  process.exit(1);
}

await cp("manifest.json", `${OUT}/manifest.json`);
await cp("src/popup/popup.html", `${OUT}/popup.html`);
if (existsSync("assets/samples")) {
  await cp("assets/samples", `${OUT}/samples`, { recursive: true });
}

console.log(
  `built ${result.outputs.length} bundles -> ${OUT}/  (load unpacked from ${OUT})`,
);
