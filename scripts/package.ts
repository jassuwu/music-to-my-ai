/**
 * Builds the store upload. One zip, versioned from manifest.json.
 *
 * The Web Store wants a zip whose ROOT is the manifest, not a folder
 * containing it, which is why this zips from inside dist/ rather than zipping
 * the directory. Source maps and the icon SVGs are excluded: dist/ carries
 * both for local work, and neither is something a reviewer should have to
 * wonder about.
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
    `upload at https://chrome.google.com/webstore/devconsole — listing copy is in store/listing.md`,
);
