import type { Adapter } from "../core/types";
import { claudeAdapter } from "./claude";
import { chatgptAdapter } from "./chatgpt";
import { makeGenericAdapter } from "./generic";
import { GENERIC_SITES } from "../sites";

/** Tuned adapters first: a tuned site must never fall through to the generic. */
export const ADAPTERS: readonly Adapter[] = [
  claudeAdapter,
  chatgptAdapter,
  ...GENERIC_SITES.map(makeGenericAdapter),
];

export function adapterFor(url: string): Adapter | undefined {
  return ADAPTERS.find((a) => {
    try {
      return a.matches(url);
    } catch {
      return false;
    }
  });
}
