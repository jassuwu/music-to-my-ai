---
id: 17
title: More sites via a generic adapter
labels: [wayfinder:build]
status: closed
assignee: jass
blocked-by: []
---

## Question

The user asked to add more sites, naming chatjimmy.ai. The charter pinned v1 to claude.ai and chatgpt.com with per-site adapters, and put a generic any-site fallback out of scope — both superseded by this request. chatjimmy.ai is a JS-rendered SPA, so its streaming DOM cannot be known without a live session; the same will be true of every site added later. What is the cheapest structure that makes a new site a one-line addition without degrading the two measured adapters?

## Resolution

**A generic adapter plus a sites registry.** The tuned claude/chatgpt adapters are untouched and matched first; every other site shares one generic adapter driven from a single `Site` list that also feeds the popup's checkboxes and the default settings. Adding a site is one registry line plus its match patterns in the manifest (content_scripts and web_accessible_resources, which the manifest cannot derive).

The generic adapter works from the one thing every streaming UI shares — some element's text grows repeatedly in one place — with rules that make that safe on an unmeasured DOM:

- **Emit only from the second growth onward.** The first growth adopts the block silently at its current length, so one-shot DOM changes (the user's own message posting, toasts, tooltips) never sound. Cost: the first Chunk of a real stream is swallowed, which is inaudible against hundreds.
- **The composer and controls never play**: anything inside `contenteditable`, inputs, buttons, menus, nav, aside, header, footer is ignored — the lessons of the four live-testing bugs on the tuned sites, applied wholesale.
- **Prefer a message-shaped ancestor** (`[class*="message"]`, `[class*="markdown"]`, `article`, `li`, …) as the growth target so the whole reply is measured rather than one paragraph; fall back to the observation root.
- **Quiescence is the only end signal** (900ms, shared constant). Before a target has sounded it is a guess and may be re-adopted; after, it stays locked until quiescence.

Degraded by design: no fast end signal, no oversized-Chunk suppression of whole-message re-renders. A site that earns it gets promoted to its own tuned adapter file.

**Sites added** (all generic, all on by default, each toggleable in the popup): chatjimmy.ai (requested), gemini.google.com, t3.chat, chat.deepseek.com, grok.com, perplexity.ai, chat.mistral.ai. Candidates left out but one line away: copilot.microsoft.com, poe.com, meta.ai, chat.qwen.ai, kimi.com, duck.ai.

None of the seven has been live-verified; that is inherent to the generic tier, and the first real stream on each is the test.
