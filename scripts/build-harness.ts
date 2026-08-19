/**
 * Builds the 0015 tuning harness: the same `Bun.build` recipe as
 * scripts/build.ts (single IIFE bundle, unhashed filename), but a separate
 * script so the extension build stays untouched. Output lands next to the
 * harness HTML, never in dist/ — this is a throwaway prototype, not part of
 * the shipped extension.
 *
 *   bun run scripts/build-harness.ts     one shot
 *   bun --watch scripts/build-harness.ts rebuild on change
 */
const result = await Bun.build({
  entrypoints: ["prototypes/tuning-harness.ts"],
  outdir: "prototypes",
  target: "browser",
  format: "iife",
  naming: "[name].js",
  sourcemap: "linked",
});

if (!result.success) {
  for (const log of result.logs) console.error(log);
  process.exit(1);
}

console.log(
  `built ${result.outputs.length} bundle(s) -> prototypes/tuning-harness.js\n` +
    `serve the REPO ROOT (not prototypes/) — e.g. \`bunx serve .\` or \`python3 -m http.server\` ` +
    `from the repo root — then open http://localhost:<port>/prototypes/tuning-harness.html. ` +
    `file:// and a prototypes/-rooted server both break the "../assets/samples" fetch.`,
);

export {};
