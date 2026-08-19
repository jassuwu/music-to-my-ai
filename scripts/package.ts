/**
 * Builds the zip people download. One file, versioned from manifest.json,
 * meant for a GitHub release: unzip it, load unpacked, done, no bun and no
 * clone. This is the whole distribution story — the Chrome Web Store wants
 * $5 for a developer account and this is a toy.
 *
 * The manifest sits at the ROOT of the zip, which is why this zips from
 * inside dist/ rather than zipping the directory: Chrome refuses a folder it
 * has to look inside of. Source maps and the icon SVGs are left out, since
 * dist/ carries both for local work and neither belongs in a download.
 *
 *   bun run package
 */
import { rm, mkdir } from "node:fs/promises";
import { $ } from "bun";

const OUT = "release";

await $`bun run scripts/build.ts`;

const { version, name } = await Bun.file("manifest.json").json();
const slug = name.replace(/\s+/g, "-");
const zip = `${slug}-${version}.zip`;

await rm(`${OUT}/${zip}`, { force: true });
await mkdir(OUT, { recursive: true });

// -X drops the macOS extended attributes; left in, every zip carries a
// __MACOSX/ shadow tree the reviewer sees and nobody wants to explain.
await $`zip -r -X ../${OUT}/${zip} . -x '*.map' -x '*.svg' -x '.DS_Store'`.cwd("dist").quiet();

const bytes = Bun.file(`${OUT}/${zip}`).size;
console.log(
  `${OUT}/${zip}  ${(bytes / 1024 / 1024).toFixed(2)} MB\n` +
    `attach it to a release: gh release create v${version} ${OUT}/${zip}`,
);
