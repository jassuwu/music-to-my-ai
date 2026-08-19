import { createUnlockedContext } from "./core/unlock";
import type { Chunk } from "./core/types";

/**
 * Skeleton entry point. Proves injection, permissions and the audio-unlock
 * path end to end by logging one line per Chunk.
 *
 * The observer below is a deliberately generic placeholder: real per-site
 * Adapters (with the measured selectors, the 900ms quiescence rule and
 * defensive fallbacks) arrive with the adapters ticket and will replace it.
 */

const LOG = "[music-to-my-agents]";
const QUIESCENCE_MS = 900;

const { ctx, ready } = createUnlockedContext();
void ready.then(() => console.log(`${LOG} audio unlocked (${ctx.sampleRate}Hz)`));

/** Text length of a node, cheap enough to call per callback. */
const lengthOf = (n: Node): number => (n.textContent ?? "").length;

function findConversationRoot(): Element {
  const candidates = [
    "main",
    '[role="main"]',
    "#__next",
  ];
  for (const sel of candidates) {
    const el = document.querySelector(sel);
    if (el) return el;
  }
  return document.body;
}

let lastLength = 0;
let chunkCount = 0;
let endTimer: ReturnType<typeof setTimeout> | undefined;
let streaming = false;

const root = findConversationRoot();
lastLength = lengthOf(root);

const observer = new MutationObserver((records) => {
  // One Chunk per callback, never per record — see Chunk in core/types.
  let added = "";
  let sawCode = false;

  for (const r of records) {
    if (r.type === "characterData") {
      added += (r.target as CharacterData).data ?? "";
    }
    for (const node of r.addedNodes) {
      added += node.textContent ?? "";
      if (
        node.nodeType === Node.ELEMENT_NODE &&
        ((node as Element).matches?.("pre, code") ||
          (node as Element).querySelector?.("pre, code"))
      ) {
        sawCode = true;
      }
    }
  }

  // Net growth of the whole subtree is the honest signal; the concatenation
  // above over-counts when a node is re-rendered rather than appended.
  const current = lengthOf(root);
  const delta = current - lastLength;
  lastLength = current;
  if (delta <= 0) return;

  const chunk: Chunk = {
    text: added.slice(0, 200),
    chars: delta,
    isCode: sawCode,
    endsSentence: /[.!?]["')\s]*$/.test(added),
    at: ctx.currentTime,
  };

  if (!streaming) {
    streaming = true;
    chunkCount = 0;
    console.log(`${LOG} stream started`);
  }
  chunkCount += 1;
  console.log(
    `${LOG} chunk ${chunkCount}: ${chunk.chars} chars` +
      `${chunk.isCode ? " [code]" : ""}${chunk.endsSentence ? " [sentence]" : ""}`,
  );

  clearTimeout(endTimer);
  endTimer = setTimeout(() => {
    streaming = false;
    console.log(`${LOG} stream ended after ${chunkCount} chunks (quiescence)`);
  }, QUIESCENCE_MS);
});

observer.observe(root, {
  childList: true,
  subtree: true,
  characterData: true,
});

console.log(`${LOG} watching ${location.hostname} — click or type to unlock audio`);
