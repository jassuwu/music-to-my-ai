# Streaming DOM anatomy of claude.ai and chatgpt.com

Research for tracker ticket [0002-streaming-dom-anatomy](../tracker/tickets/0002-streaming-dom-anatomy.md).

All web research below was performed 2026-08-15. No authenticated browser session was available for this pass — nothing here was inspected live on the signed-in sites. Every claim is instead traced to a primary source (actual repo source files, actual commit history, actual captured DOM snapshots, or a technical write-up), with the source's own date attached, because both sites are React SPAs that ship new markup on a timescale of weeks to months. See [Requires live inspection](#requires-live-inspection) for what genuinely cannot be settled without logging in.

## TL;DR / Recommendation

- **claude.ai**: key off `[data-testid="user-message"]` for user turns and `.font-claude-message` / `.font-claude-response` for the assistant's rendered content, nested in a wrapper that (as of a 2025-08-02 capture) carries a **`data-is-streaming="true"|"false"` boolean attribute** — the single best end-of-stream signal if it behaves as its name implies. A `[data-testid="stop-button"]` (present in claude.ai's UI while generating) is a second, independent signal. Prefer these `data-testid`/`data-*` selectors over any Tailwind utility class; utility classes are literal (not hashed) on claude.ai but have still driven at least one confirmed selector-breaking frontend update.
- **chatgpt.com**: key off `[data-testid^="conversation-turn-"]` (currently an `<article>` element, was possibly a `<section>` in the past — the attribute prefix, not the tag, is the durable part) and `[data-message-author-role="assistant"][data-message-id]` for the actual content wrapper. For end-of-stream, prefer **`button[data-testid="stop-button"]` presence/absence** — confirmed as the production signal used by `chatgpt.js` (2,042★, pushed 2026-08-10, five days before this research) — over the older `.result-streaming` CSS-class hypothesis (documented only by a technical blog post of unconfirmed date and a 2023 Selenium script, not corroborated by any 2025/2026 source). `data-testid="copy-turn-action-button"` / `good-response-turn-action-button` / `bad-response-turn-action-button` action buttons are confirmed present in a completed-turn DOM capture, consistent with "action buttons appear at end of stream," though their absence during active streaming was not directly observed.
- **Granularity/cadence of MutationObserver callbacks during streaming (characterData vs childList vs subtree replace) was not settled by any source found for either site.** This is the single biggest gap and the top candidate for a live-inspection follow-up ticket — it directly determines how noisy/expensive an adapter's mutation callback needs to be.
- **Selector churn is real and dated**: two independently-maintained, actively-updated open-source projects each show a full "adapt to new frontend" fix within the last 12 months for both sites (see [Breakage evidence](#breakage-evidence-cross-site) below), plus one explicit "overhaul of DOM selectors for ChatGPT, Claude, and Copilot" breaking release 5 months ago. An adapter for this project should assume it will need re-tuning on a similar (few-month) cadence and should build in the kind of `messageSelectors` **fallback chain** (try `data-testid` first, degrade to a class-based guess) that the most defensive of the projects below already uses.

---

## claude.ai

### Container / selectors

**Verified**, from a captured live DOM sample checked into the `ai-chat-exporter` repo (`reference-html-dom/claude-single-user-response-with-artifact-dom.html`, added in commit dated 2025-08-02) — [source](https://raw.githubusercontent.com/revivalstack/ai-chat-exporter/main/reference-html-dom/claude-single-user-response-with-artifact-dom.html), [commit](https://github.com/revivalstack/ai-chat-exporter/commits/main/reference-html-dom/claude-single-user-response-with-artifact-dom.html):

```html
<div data-is-streaming="false" class="group relative -tracking-[0.015em] pb-8" style="opacity: 1; transform: none">
  <div class="font-claude-message relative leading-[1.65rem] [&_pre>div]:bg-bg-000/50 ...">
    <div><div class="grid-cols-1 grid gap-2.5 [&_>_*]:min-w-0">
      <p class="whitespace-normal break-words">Yes, exactly! ...</p>
    </div></div>
    ...
  </div>
</div>
```

- `data-is-streaming="false"` is a real, present attribute on the outer message wrapper — this is a boolean-looking data attribute purpose-built for exactly the signal an adapter needs. Only the `"false"` (post-completion) state was captured in this snapshot; the `"true"` state during active streaming was not directly observed in any source (see live-inspection item 1).
- `.font-claude-message` wraps the rendered markdown content in this same capture.
- Independently, `.font-claude-response` (not `.font-claude-message`) is the class referenced by two other, differently-dated sources: the `ai-chat-exporter.user.js` constant `CLAUDE_MESSAGE_SELECTOR = ".font-claude-response:not(#markdown-artifact), [data-testid='user-message']"` ([source](https://raw.githubusercontent.com/revivalstack/ai-chat-exporter/main/ai-chat-exporter.user.js), fetched 2026-08-15 from `main`) and `Claude-Powerest-Manager_Enhancer`'s `hasClaudeResponse = !!turnElement.querySelector('.font-claude-response')` ([source](https://raw.githubusercontent.com/f14XuanLv/Claude-Powerest-Manager_Enhancer/main/ClaudePowerestManager%26Enhancer.user.js), fetched 2026-08-15). Whether `.font-claude-message` and `.font-claude-response` are the same class renamed over time, or two distinct classes that coexist (e.g. one on an outer block, one on the prose content), is **not resolved** — flagged for live inspection.
- `[data-testid="user-message"]` for the user's own turn — confirmed independently in `ai-chat-exporter.user.js` (`CLAUDE_USER_MESSAGE_SELECTOR`), `Claude-Powerest-Manager_Enhancer` (`turnElement.querySelector('[data-testid="user-message"]')`), and `claude-a11y`'s adapter table (`[data-testid="chat-message-content"]`, `[data-testid="conversation-turn"]` — see below).
- `[data-testid="action-bar-copy"]` — a copy button, present in the completed-turn DOM capture referenced above.
- `[data-testid="stop-button"]` — a "stop generating" button, given as the first-choice `stopSelectors` entry for claude.ai in `claude-a11y`'s site-adapter registry (`packages/browser/chat-a11y.js`, commit dated 2026-03-02, [source](https://raw.githubusercontent.com/JacquelineDMcGraw/claude-a11y/main/packages/browser/chat-a11y.js)):

```js
{
  name: "claude",
  match: function (host) { return host.indexOf("claude.ai") !== -1; },
  messageSelectors: [
    '[data-testid="chat-message-content"]',
    '[data-testid="conversation-turn"]',
    '[class*="font-claude"]',
    ".prose",
    '[class*="ConversationItem"]',
  ],
  stopSelectors: [
    '[data-testid="stop-button"]',
    'button[aria-label*="top"]',
    'button[aria-label*="Cancel"]',
  ],
  ...
}
```

Note the deliberate **fallback chain** — `data-testid` first, then progressively looser class-based guesses — which the author explicitly documents elsewhere in the same repo's README as a hedge: *"claude.ai has the most complete selector coverage. Other sites use best-effort DOM selectors that may need updating as those sites change."* ([README](https://github.com/JacquelineDMcGraw/claude-a11y), repo last pushed 2026-06-12).

- No confirmed example of a **hashed/volatile CSS-module class name** (e.g. `_abc123`) was found anywhere in the claude.ai captures or source reviewed. All observed classes on claude.ai (`group relative -tracking-[0.015em] pb-8`, `font-claude-message`, `artifact-block-cell`, etc.) are literal, readable Tailwind utility / semantic classes. This doesn't mean hashed classes don't exist elsewhere on the page — none were found in the message/streaming subtree specifically, in the samples available.

### Granularity / cadence of MutationObserver callbacks during streaming

**Not verified by any source found.** No open-source project inspected instruments or depends on the specific shape of DOM mutations (characterData growth vs. childList node-append vs. wholesale subtree replace) during an active claude.ai stream. `claude-a11y` does use a `MutationObserver` (`packages/browser/chat-a11y.js` line 7 comment: *"Uses a MutationObserver to watch for new chat messages and transforms"*) but it observes for **new completed messages to accessibility-annotate**, debounced (ARCHITECTURE notes mention a 150ms debounce, per the v1.1.0 changelog entry), not for fine-grained in-progress streaming text. This is a **live-inspection item** (see below).

### End-of-stream signal

**Verified attribute exists, behavior partly inferred:**
- `data-is-streaming` flipping from `"true"` to `"false"` is the most promising signal — the attribute name and a `"false"` resting state are confirmed; the `"true"` state and its exact transition timing were not observed directly.
- `claude-a11y`'s own changelog (commit dated 2026-03-02, [source](https://github.com/JacquelineDMcGraw/claude-a11y/commits/main/packages/browser/chat-a11y.js)) states the extension itself *"set[s] `aria-busy` on response container while Claude is generating, clear[s] it on completion"* — but this is the **extension adding** `aria-busy` for its own accessibility purposes (i.e., it's the extension's output, not a native claude.ai attribute the extension is reading), so it is not itself evidence of a native claude.ai end-of-stream signal — it does, however, corroborate that the extension author found *some* reliable way to detect generation start/stop to drive it (most likely the `stopSelectors` presence/absence, or `data-is-streaming`).
- Disappearance of the `[data-testid="stop-button"]` element is a second plausible, independent signal per `claude-a11y`'s adapter table above.
- Appearance of `[data-testid="action-bar-copy"]` (copy button) is consistent with "action buttons appear at completion," confirmed present in a post-completion capture, but its absence during active streaming was not directly observed.

### Breakage evidence

**Verified, dated:**
- `Claude-Powerest-Manager_Enhancer`, commit dated **2025-12-17**, titled *"fix(v1.2.5): 适配Claude前端DOM结构更新,修复多项功能失效问题"* ("adapt to Claude frontend DOM structure update, fix multiple broken features") — [commit](https://github.com/f14XuanLv/Claude-Powerest-Manager_Enhancer/commits/main/). The commit body explicitly documents: pure-file user messages no longer being recognized (fixed by adding file-thumbnail detection to `findCurrentTurns()`), a "branch index selector" that was fixed by **removing a dependency on color class names** (i.e., an earlier version depended on a volatile Tailwind color-utility class that broke and had to be replaced), and updated chat-input button-injection selectors to match a new toolbar layout.
- `ai-chat-exporter`'s `CHANGELOG.md` records a **v3.0.0 breaking release dated 2026-03-20**: *"BREAKING CHANGE: Overhaul of DOM selectors for ChatGPT, Claude, and Copilot"* ([source](https://raw.githubusercontent.com/revivalstack/ai-chat-exporter/main/CHANGELOG.md)) — i.e. a full selector rewrite for claude.ai (and chatgpt.com) roughly 5 months before this research was performed.

---

## chatgpt.com

### Container / selectors

**Verified**, from a captured live DOM sample checked into `ai-chat-exporter` (`reference-html-dom/chatgpt-dom.html`, added in a commit dated **2025-06-30**, [source](https://raw.githubusercontent.com/revivalstack/ai-chat-exporter/main/reference-html-dom/chatgpt-dom.html)):

```html
<article class="text-token-text-primary w-full" dir="auto"
         data-testid="conversation-turn-1" data-scroll-anchor="false">
  <h5 class="sr-only">You said:</h5>
  ...
  <div data-message-author-role="user"
       data-message-id="de3f3dd3-3ab9-4a8a-a90d-947f0804f249"
       dir="auto" class="min-h-8 text-message relative flex w-full flex-col ...">
    ...
  </div>
</article>
```

and, for the assistant's rendered markdown, `class="markdown prose dark:prose-invert w-full break-words light"` was found in the same capture (Tailwind Typography "prose" convention — a readable, non-hashed class name, though "readable" isn't the same guarantee as "stable" for adapter purposes).

- `[data-testid^="conversation-turn-N"]` (turn container) — **independently re-confirmed live from the `pionxzh/chatgpt-exporter` repo's `main` branch**, fetched 2026-08-15 (same day as this research), 2.7k★, actively maintained (last commit **2026-08-14**):

```ts
// src/page.ts
export function checkIfConversationStarted() {
    return !!document.querySelector('[data-testid^="conversation-turn-"]')
}
```
and, in the exporter's PNG-export code (`src/exporter/image.ts`):
```ts
const thread = document.querySelector('#thread div:has(> [data-testid="conversation-turn-1"]')
```
[source](https://raw.githubusercontent.com/pionxzh/chatgpt-exporter/master/src/exporter/image.ts) — also shows `#thread`, `#thread-bottom-container`, `#page-header` as stable container ids, and the Tailwind BEM-ish class `.group\/conversation-turn` for the action-bar row.

- `data-message-author-role="user"|"assistant"`, `data-message-id`, `data-message-model-slug` — all three confirmed live in the same `pionxzh/chatgpt-exporter` codebase (`src/main.tsx`, fetched 2026-08-15: `document.querySelectorAll('main [data-testid^="conversation-turn-"] [data-message-id]')`) and in the 2025-06-30 captured DOM (`data-message-author-role="user"`, `data-message-id="..."`).
- `data-testid="accounts-profile-button"` and 20+ other `data-testid`s were present in the 2025-06-30 capture, for chrome (sidebar, composer, action buttons) rather than message content — see full list in Sources.
- Action buttons present in the completed-turn capture (2025-06-30): `data-testid="copy-turn-action-button"`, `good-response-turn-action-button`, `bad-response-turn-action-button`, `voice-play-turn-action-button` — consistent with "action buttons appear once generation completes," though **absence during active streaming was not directly observed** in any source.
- **A confirmed volatile, hashed CSS-module class was found in the same 2025-06-30 capture**, in the composer/input area (not inside a message turn): `class="_prosemirror-parent_kfgfu_2 text-token-text-primary max-h-[25dvh] ..."` — a `_name_hash_n` pattern typical of CSS Modules with scoped hashing. This is direct, dated evidence that chatgpt.com **does** use volatile hashed classes in some regions of the page, even while the message-turn/`data-testid` structure stayed literal and semantic in the same snapshot. No hashed class was found specifically *inside* a message turn's content subtree in the sources reviewed — but the composer example shows the pattern exists on the site, so it can't be ruled out for other, unexamined parts of the tree.
- **Discrepancy worth flagging**: `ai-chat-exporter.user.js`'s own constant is `CHATGPT_ARTICLE_SELECTOR = "section[data-testid^='conversation-turn-']"` (tag `section`) — but the captured DOM in the *same repository* shows the actual element is `<article data-testid="conversation-turn-1">` (tag `article`). Either the constant is stale relative to the repo's own reference capture, or the tag differs by context (e.g. share page vs. regular chat). Either way, this is a concrete illustration of why an adapter should match on `[data-testid^="conversation-turn-"]` alone and never assume the wrapping tag name.
- `aria-live="polite"` and `aria-live="assertive"` regions exist somewhere on the page per the 2025-06-30 capture, but their exact location/purpose (toast notifications vs. the message stream itself) was not confirmed.

### Granularity / cadence of MutationObserver callbacks during streaming

**Not verified by any source found for chatgpt.com specifically.** The most relevant primary-source-adjacent material is a technical write-up, "Mastering Stream Detection: Using MutationObserver to Track LLM Responses in Real-Time," accessed via the Wayback Machine (the live URL now 404s, so the article's own current existence/date is itself unconfirmed — [archived copy](https://web.archive.org/web/2026/https://www.fogel.dev/detecting_llm_streaming_completion), accessed 2026-08-15). It describes the *architecture* needed, not raw mutation logs, and doesn't discuss token/character-level granularity — it treats the streaming node as an opaque unit that either has or lacks a `result-streaming` class:

> "ChatGPT uses a specific class (e.g. `result-streaming`) to indicate the status of the response: When a new response starts streaming, a new DOM node is created with a `result-streaming` class. As the response continues to stream, content is added to this node. Once the streaming is complete, the `result-streaming` class is removed from the node."

It goes on to describe a **two-stage `MutationObserver` pattern** — one long-lived observer watching for new response nodes to appear (so it isn't disconnected after the first response), and per-node attribute-mutation watching (`attributes: true, subtree: true`, filtered to the class attribute) for that node's `result-streaming` class being removed — specifically to avoid two failure modes: disconnecting after the first response (which misses all subsequent ones), and not disconnecting at all (which risks firing the "done" handler more than once per response). This is a reasonable architecture to adapt, but:
- The article's own timeliness is unconfirmed (it says "old post... many ideas found here are no longer applicable" in a different, unrelated context on the same domain per the crawl, and the live URL is now dead).
- A `result-streaming` class was also referenced in an old (2023-03-20) Selenium automation script, `pyChatGPT.py`: `chatgpt_streaming = (By.CLASS_NAME, 'result-streaming')` ([source](https://raw.githubusercontent.com/HimanshuJakhmola356/pyChatGPT/master/src/pyChatGPT/pyChatGPT.py)) — confirming the pattern existed in the GPT-3.5-era UI, but chatgpt.com's frontend has since gone through at least the framework migrations documented below, so **this should be treated as an unverified hypothesis for the current (2026) UI, not a confirmed fact.**
- No mention of `result-streaming` (or any equivalent) was found in the 2025-06-30 or later captures/source reviewed for this research — though that's expected, since none of those captures were taken mid-stream.

### End-of-stream signal

**Verified, and this is the strongest evidence in this whole report:** `KudoAI/chatgpt.js` — a widely-used, actively maintained client-side library (2,042★, [repo](https://github.com/KudoAI/chatgpt.js/), pushed **2026-08-10**, five days before this research) — uses **stop-button presence/absence as its production "is generating" signal**, not a streaming CSS class. From `src/chatgpt.js` ([source](https://raw.githubusercontent.com/KudoAI/chatgpt.js/main/src/chatgpt.js), fetched 2026-08-15):

```js
selectors: {
  chatBtns: {
    ...
    stop: 'button[data-testid=stop-button]',
    ...
  },
  chatDivs: {
    msg: 'li[data-message-role], div[data-message-author-role]',
    reply: 'li[data-message-role=assistant], div[data-message-author-role=assistant]'
  }
}

async isIdle(timeout = null) {
    const obsConfig = { childList: true, subtree: true }
    ...
    await new Promise(resolve => // when reply starts generating
        new MutationObserver((_, obs) => {
            if (chatgpt.getStopButton()) { obs.disconnect() ; resolve() }
        }).observe(document.body, { childList: true, subtree: true })
    )
    ...
    return new Promise(resolve => // when code stops generating
        new MutationObserver((_, obs) => {
            if (lastReplyDiv?.querySelector('pre')?.nextElementSibling
                || !chatgpt.getStopButton() // ...or reply outright stopped generating
            ) { obs.disconnect() ; resolve(true) }
        }).observe(document.body, obsConfig)
    )
}
```

This both (a) independently re-confirms `button[data-testid=stop-button]` (matching `claude-a11y`'s `stopSelectors` entry for chatgpt.com, dated 2026-03-02) as the currently-relied-upon end-of-generation signal in a large, currently-maintained project, and (b) shows the actual `MutationObserver` **granularity used in production**: `{ childList: true, subtree: true }` observing `document.body`, reactively re-querying selectors on each callback rather than inspecting `characterData` directly. This is the closest thing to a "real" cadence data point found for chatgpt.com in this research, though it's still an observation strategy, not a raw log of mutation frequency/size (see live-inspection item 4).
- `.result-streaming` class removal — the older, blog-documented hypothesis; **not corroborated by this more current source**, so it should be considered superseded/unconfirmed rather than a second independent signal.
- `claude-a11y`'s chatgpt adapter (dated 2026-03-02) also lists `button[aria-label="Stop generating"]` as an alternate `stopSelectors` entry alongside `button[data-testid="stop-button"]`.
- Action buttons (`copy-turn-action-button`, etc.) appearing — consistent with, but not directly confirmed as being absent during, active streaming.

### Breakage evidence

**Verified, dated**, all from `pionxzh/chatgpt-exporter` (2.7k★, 531 commits, actively maintained, [repo](https://github.com/pionxzh/chatgpt-exporter)):
- **2026-07-05**: `fix: retire access to __NEXT_DATA__ and __remixContext` (closes [#362](https://github.com/pionxzh/chatgpt-exporter/issues/362), reported 2026-07-04) — chatgpt.com apparently stopped exposing one or both of these framework-internal globals the exporter relied on to read conversation data, breaking shared-conversation export.
- **2026-05-03**: `fix: adapt to chatgpt new sidebar` (closes [#352](https://github.com/pionxzh/chatgpt-exporter/issues/352), reported 2026-04-30 as "Export menu position is misaligned in ChatGPT sidebar on macOS Chrome").
- **2025-05-11**: `fix: fix button position disappeared on new sidebar layout` (closes #290).
- **2024-09-07**: `fix: fix the script not working on share page`.
- **2024-09-04**: `fix: adapt remix version and try to reduce call to session api` — evidence chatgpt.com's frontend runs (or ran) on Remix, and that a Remix version bump broke selectors/globals the exporter depended on.
- **2024-09-12**: `fix: handle hydration missing menu and style`.
- Older, still-open historical issue: [#… "Only latter section of chat exporting (data-testid has discontinuities)"](https://github.com/pionxzh/chatgpt-exporter), created 2024-01-17 — direct evidence that even the `data-testid^="conversation-turn-"` numbering has had edge cases where numbers were non-contiguous, an important gotcha for any adapter that assumes turn numbers increment cleanly by 1.
- A currently-**open** troubleshooting issue, ["No Export button?"](https://github.com/pionxzh/chatgpt-exporter), created **2026-08-09** (6 days before this research) — consistent with ongoing, recurring breakage risk rather than a solved problem.
- `ai-chat-exporter`'s `CHANGELOG.md` v3.0.0 (**2026-03-20**) breaking-change entry covers a DOM-selector overhaul for ChatGPT as well as Claude (see claude.ai section above) — the same release touched both sites' selectors simultaneously.
- `KudoAI/chatgpt.js` (2,042★, pushed 2026-08-10) issue history independently corroborates the same churn pattern: ["Updated CSS selector for the getRegenerateButton method"](https://github.com/KudoAI/chatgpt.js) (2024-05-09) and ["Fixing changes in ChatGPT web interface"](https://github.com/KudoAI/chatgpt.js) (2024-05-15) — a third, unrelated project independently hit and fixed a chatgpt.com selector break within days of the same UI change.

---

## Cross-site patterns / adapter design implications

1. **Prefer `data-testid` / `data-message-*` attributes over any class name, on both sites.** These are the only selector category that multiple, independently-maintained projects (spanning 2024–2026) kept relying on even as classes and framework internals (Remix routing, `__NEXT_DATA__`/`__remixContext`, sidebar layout) churned underneath them.
2. **Even `data-testid` selectors need a fallback chain, not a single hard-coded string.** `claude-a11y`'s site-adapter registry (`messageSelectors: [data-testid, ..., class-based, ..., wildcard [class*=...]]`) is a good reference pattern to imitate directly — try the most specific, semantically-named attribute first, degrade gracefully.
3. **The most promising per-site "is this actively streaming" primitives found:**
   - claude.ai: `data-is-streaming` attribute on the message wrapper (name/false-state confirmed; true-state/transition unconfirmed) and/or presence of `[data-testid="stop-button"]`.
   - chatgpt.com: presence of `button[aria-label="Stop generating"]` / `button[data-testid="stop-button"]` (per `claude-a11y`'s adapter table), and/or a `.result-streaming` class (unconfirmed for the current UI — see live-inspection item 2).
   - Both of these are attribute/class-presence checks, which pair well with a `MutationObserver` configured with `attributes: true` and a narrow `attributeFilter`, rather than requiring `characterData`/`childList` inspection of message content itself.
4. **Do not assume the wrapping tag name is stable** — chatgpt.com's own `ai-chat-exporter` project has a `section`-tag selector constant that disagrees with its own more recent `article`-tag DOM capture. Match on `data-testid`, ignore the tag.
5. **A dedicated action-bar / "stop" button disappearing plus new action buttons (copy, thumbs, share) appearing** is the most-corroborated *structural* completion signal across both sites' adapters, even though no source directly observed the moment of transition. This is a reasonable secondary/confirming signal alongside the primary attribute-based one on each site.
6. **Selector churn should be budgeted for on the order of every 2–6 months per site**, based on the dated commit history above (chatgpt-exporter: roughly one DOM-adaptation fix every 2–4 months since 2024; claude.ai: at least one confirmed frontend-structure break in the last 12 months, plus a cross-site "overhaul" release 5 months ago). An adapter module should be written expecting maintenance on that cadence, not as a "write once" artifact.

---

## Requires live inspection

None of the following can be settled from GitHub/web sources alone. Each is phrased as a concrete follow-up task.

1. **claude.ai streaming-state attribute behavior.** Log into claude.ai with DevTools open, send a prompt, and record on the message wrapper: (a) does `data-is-streaming="true"` actually appear the moment generation starts and flip to `"false"` when it ends (only the `"false"` resting state was found in archived captures); (b) is `.font-claude-message` and `.font-claude-response` the same class (renamed over time) or two distinct classes that coexist on different elements; (c) is `[data-testid="action-bar-copy"]` and friends genuinely absent/disabled while `data-is-streaming="true"`, confirming them as a secondary completion signal.
2. **claude.ai MutationObserver granularity during an actual stream.** With DevTools open (or a temporary `console.log` in an injected `MutationObserver`), record whether streamed text arrives as `characterData` growth on existing text nodes, `childList` appends of new small nodes/spans, or periodic wholesale subtree replacement of the markdown container (e.g. on every markdown re-parse) — and whether this differs for plain prose vs. content containing code blocks or artifacts. This determines whether a naive "any mutation = trigger a note" adapter will be too noisy/expensive.
3. **chatgpt.com's current streaming-class or streaming-attribute mechanism.** Log into chatgpt.com with DevTools open and determine whether `.result-streaming` (last independently confirmed 2023, referenced by an unconfirmed-vintage blog post) is still the mechanism marking an in-progress turn, or has been replaced — e.g. by an `aria-busy` attribute, or by leveraging the `aria-live="polite"`/`"assertive"` regions whose exact location/purpose in the 2025-06-30 capture was not determined. Also confirm the current wrapping tag (`<article>` vs `<section>`) for `[data-testid^="conversation-turn-"]`, since two sources within the same OSS project disagree.
4. **chatgpt.com MutationObserver granularity during an actual stream.** Same measurement as claude.ai item 2, for chatgpt.com — record characterData vs. childList vs. subtree-replace behavior, and whether code-block/canvas-style responses trigger a different (likely heavier, more "replace the whole block") mutation pattern than plain text.
5. **Both sites: whether the framework batches/throttles the DOM updates a `MutationObserver` actually sees relative to raw token arrival.** React 18's automatic batching (and any `requestAnimationFrame`-aligned render scheduling) could mean the observer callback fires at a coarser, more irregular cadence than the underlying SSE token stream — this materially affects whether a mutation-driven sonification "feels" like real streaming or like uneven bursts. Can only be measured by logging actual `MutationObserver` records timestamped against a real response on each site.
6. **Whether hashed/volatile CSS-module classes (confirmed only in chatgpt.com's composer, e.g. `_prosemirror-parent_kfgfu_2`) also appear anywhere inside the message-turn/streaming subtree itself** on either site, which would matter if an adapter ever needs to match structural elements beyond the already-verified `data-testid`/`data-message-*` attributes.

---

## Sources

- `revivalstack/ai-chat-exporter` — GitHub repo. [main.tsx-equivalent user script](https://raw.githubusercontent.com/revivalstack/ai-chat-exporter/main/ai-chat-exporter.user.js) (fetched 2026-08-15); [captured claude.ai DOM sample](https://raw.githubusercontent.com/revivalstack/ai-chat-exporter/main/reference-html-dom/claude-single-user-response-with-artifact-dom.html) (commit dated 2025-08-02); [captured chatgpt.com DOM sample](https://raw.githubusercontent.com/revivalstack/ai-chat-exporter/main/reference-html-dom/chatgpt-dom.html) (commit dated 2025-06-30); [CHANGELOG.md](https://raw.githubusercontent.com/revivalstack/ai-chat-exporter/main/CHANGELOG.md) (v3.0.0 entry dated 2026-03-20); [GreasyFork listing](https://greasyfork.org/en/scripts/456055-chatgpt-exporter) (unrelated cross-reference, not primary for this repo).
- `pionxzh/chatgpt-exporter` — GitHub repo, 2.7k★, fetched live from `master` 2026-08-15. [`src/page.ts`](https://raw.githubusercontent.com/pionxzh/chatgpt-exporter/master/src/page.ts); [`src/main.tsx`](https://raw.githubusercontent.com/pionxzh/chatgpt-exporter/master/src/main.tsx); [`src/exporter/image.ts`](https://raw.githubusercontent.com/pionxzh/chatgpt-exporter/master/src/exporter/image.ts); [`src/api.ts`](https://raw.githubusercontent.com/pionxzh/chatgpt-exporter/master/src/api.ts); commit history and issues queried via `gh api repos/pionxzh/chatgpt-exporter/...` on 2026-08-15, including [issue #362](https://github.com/pionxzh/chatgpt-exporter/issues/362) (2026-07-04/2026-07-05), [issue #352](https://github.com/pionxzh/chatgpt-exporter/issues/352) (2026-04-30/2026-05-03), and the open ["No Export button?" issue](https://github.com/pionxzh/chatgpt-exporter) (2026-08-09).
- `JacquelineDMcGraw/claude-a11y` — GitHub repo, 10★, last pushed 2026-06-12. [`packages/browser/chat-a11y.js`](https://raw.githubusercontent.com/JacquelineDMcGraw/claude-a11y/main/packages/browser/chat-a11y.js), specifically the `siteAdapters` registry and commit dated 2026-03-02 ("Systematic ARIA hardening..." / "Complete remaining critique items: multi-site adapters..."); [README](https://github.com/JacquelineDMcGraw/claude-a11y).
- `f14XuanLv/Claude-Powerest-Manager_Enhancer` — GitHub repo. [`ClaudePowerestManager&Enhancer.user.js`](https://raw.githubusercontent.com/f14XuanLv/Claude-Powerest-Manager_Enhancer/main/ClaudePowerestManager%26Enhancer.user.js) (fetched 2026-08-15); commit dated **2025-12-17** ("fix(v1.2.5): 适配Claude前端DOM结构更新..."), commit dated 2026-06-16 (recursion-stack-overflow fix, unrelated to selectors but shows recent activity).
- "Mastering Stream Detection: Using MutationObserver to Track LLM Responses in Real-Time" — fogel.dev, live URL now returns 404; accessed via [Wayback Machine archive](https://web.archive.org/web/2026/https://www.fogel.dev/detecting_llm_streaming_completion) on 2026-08-15. Original publish date not confirmed.
- `HimanshuJakhmola356/pyChatGPT` (fork of an early Selenium-based ChatGPT automation library) — [`src/pyChatGPT/pyChatGPT.py`](https://raw.githubusercontent.com/HimanshuJakhmola356/pyChatGPT/master/src/pyChatGPT/pyChatGPT.py), last touched **2023-03-20**; cited only as historical evidence the `result-streaming` class existed circa GPT-3.5-era UI, not as a current-UI source.
- `KudoAI/chatgpt.js` — GitHub repo, 2,042★, pushed **2026-08-10**. [`src/chatgpt.js`](https://raw.githubusercontent.com/KudoAI/chatgpt.js/main/src/chatgpt.js) (fetched 2026-08-15), specifically `selectors.chatBtns`/`selectors.chatDivs` and the `isIdle()` method's `MutationObserver` usage; issue history queried via `gh api search/issues`, including "Updated CSS selector for the getRegenerateButton method" (2024-05-09) and "Fixing changes in ChatGPT web interface" (2024-05-15), both against https://github.com/KudoAI/chatgpt.js.
- GitHub code/issue search (`gh api search/code`, `gh api search/issues`) run on 2026-08-15 to locate the above and to check for corroborating/contradicting mentions of `result-streaming`, `data-message-author-role`, and selector-breakage issues generally.
