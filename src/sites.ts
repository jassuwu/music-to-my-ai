/**
 * The single list of sites Aux runs on. The popup's checkboxes, the default
 * settings, and the adapter registry all derive from here.
 *
 * Keep in sync with manifest.json: content_scripts matches and
 * web_accessible_resources matches are the same hosts, spelled as match
 * patterns (the manifest cannot import this file).
 */

export interface Site {
  readonly id: string;
  /** Shown in the popup and used as the hostname suffix the adapter matches. */
  readonly host: string;
}

/** Sites with hand-tuned adapters built from live DOM measurement. */
export const TUNED_SITES: readonly Site[] = [
  { id: "claude", host: "claude.ai" },
  { id: "chatgpt", host: "chatgpt.com" },
];

/**
 * Sites covered by the generic adapter: growth heuristic plus quiescence,
 * no site-specific signals. Adding a site is one line here plus two match
 * patterns in the manifest.
 */
export const GENERIC_SITES: readonly Site[] = [
  { id: "chatjimmy", host: "chatjimmy.ai" },
  { id: "gemini", host: "gemini.google.com" },
  { id: "t3", host: "t3.chat" },
  { id: "deepseek", host: "chat.deepseek.com" },
  { id: "grok", host: "grok.com" },
  { id: "perplexity", host: "perplexity.ai" },
  { id: "mistral", host: "chat.mistral.ai" },
];

export const SITES: readonly Site[] = [...TUNED_SITES, ...GENERIC_SITES];

export const DEFAULT_SITES: Record<string, boolean> = Object.fromEntries(
  SITES.map((site) => [site.id, true]),
);
