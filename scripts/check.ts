/**
 * The checks CI runs, and the only ones worth running: each one guards a
 * place where two files have to agree and nothing but attention keeps them
 * agreeing.
 *
 *   bun run check           everything
 *   bun run check v1.2.0    also assert a tag matches manifest.json's version
 *
 * There is no test suite to run alongside these. The parts worth testing —
 * adapters, the mapping's feel — are measured against live pages and judged
 * by ear, which is what tracker/tickets/0006 and 0015 were. What is left is
 * bookkeeping, and bookkeeping is exactly what a machine should check.
 */
import { existsSync } from "node:fs";
import { SITES } from "../src/sites";
import { INSTRUMENTS } from "../src/instruments";

const problems: string[] = [];
const fail = (message: string) => problems.push(message);

const manifest = await Bun.file("manifest.json").json();
const pkg = await Bun.file("package.json").json();

/* Two version numbers, one release. The store is gone but the number still
   travels — it names the zip, the tag and the release. */
if (manifest.version !== pkg.version) {
  fail(`version mismatch: manifest.json ${manifest.version}, package.json ${pkg.version}`);
}

/* Called with a tag by the release workflow. A tag that disagrees with the
   manifest ships a build labelled as something it is not. */
const tag = process.argv[2]?.replace(/^refs\/tags\//, "").replace(/^v/, "");
if (tag && tag !== manifest.version) {
  fail(`tag v${tag} does not match manifest.json version ${manifest.version}`);
}

/* src/sites.ts says it must be kept in sync with the manifest by hand,
   because the manifest cannot import TypeScript. This is that hand. */
const content: string[] = manifest.content_scripts[0].matches;
const resources: string[] = manifest.web_accessible_resources[0].matches;

for (const site of SITES) {
  const pattern = `https://${site.host}/*`;
  if (!content.includes(pattern)) {
    fail(`manifest content_scripts is missing ${pattern} (site "${site.id}")`);
  }
  if (!resources.includes(pattern)) {
    fail(`manifest web_accessible_resources is missing ${pattern} (site "${site.id}")`);
  }
}

for (const pattern of content) {
  const host = pattern.replace("https://", "").replace("/*", "").replace(/^\*\./, "");
  if (!SITES.some((site) => site.host === host)) {
    fail(`manifest matches ${pattern}, which no site in src/sites.ts claims`);
  }
}

/* The samples are fetched by the sampler and the resources list is what
   permits the fetch. Two lists that must be one. */
if (JSON.stringify(content) !== JSON.stringify(resources)) {
  fail("content_scripts and web_accessible_resources list different hosts");
}

/* A missing sample is survivable at runtime — the sampler falls back to the
   closest note it has — which is exactly why it would ship unnoticed. */
for (const instrument of INSTRUMENTS) {
  for (const path of Object.values(instrument.samples)) {
    if (!existsSync(`assets/${path}`)) {
      fail(`${instrument.id}: missing sample assets/${path}`);
    }
  }
}

for (const path of Object.values(manifest.icons) as string[]) {
  if (!existsSync(`assets/${path}`)) fail(`missing icon assets/${path}`);
}

if (problems.length > 0) {
  console.error(problems.map((p) => `  ✗ ${p}`).join("\n"));
  process.exit(1);
}

console.log(
  `ok — ${SITES.length} sites match the manifest, ` +
    `${INSTRUMENTS.length} instruments have every sample, v${manifest.version}`,
);
