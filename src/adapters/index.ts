import type { Adapter } from "../core/types";
import { claudeAdapter } from "./claude";
import { chatgptAdapter } from "./chatgpt";

export const ADAPTERS: readonly Adapter[] = [claudeAdapter, chatgptAdapter];

export function adapterFor(url: string): Adapter | undefined {
  return ADAPTERS.find((a) => {
    try {
      return a.matches(url);
    } catch {
      return false;
    }
  });
}
