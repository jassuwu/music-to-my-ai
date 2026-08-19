# Context

Glossary for Music to My AI — a browser extension that turns streaming LLM responses into sound. ("Music to My Agents" was the working title, which the repo directory still carries; "Halo", "Aux" and "Plainsong" were short-lived intermediates.)

## Glossary

- **Music to My AI** — the product's name, settled by the user after a naming workshop: "music to my ears" with the AI in it, the idiom the product makes literal. The visual identity stays borrowed from the owner's site (jass.gg tokens; the icon square is its lime).
- **Sonification** — turning the arrival of streamed response text into sound in real time.
- **Stream** — one assistant response while it is still growing on the page.
- **Chunk** — **one MutationObserver callback in which the Stream's text grew** — not one mutation record, and not a model token. Coalescing at the callback boundary is what makes the rate playable: measured live at 4.8/sec on claude.ai and 6.6/sec on chatgpt.com, where per-record firing would burst dozens of notes in a single millisecond. Chunk size varies wildly (median 3–33 chars, up to 5,405 when a code block flushes).
- **Mapping** — the rule set translating Chunks into sound. Settled as **Direct**: exactly one sound per Chunk, fired on arrival, never smoothed or rescheduled. There is only one Mapping; the discarded "Sound Pack" idea (switchable bundles of alternative Mappings) is retired.
- **Voice** — the character of a single chunk-hit: timbre, envelope, register, and space. Settled per instrument; Kalimba-like warmth is the default.
- **Instrument** — the user-selectable sound source a Voice is built on (piano, guitar, sitar, harp, …). The only thing the user may swap; the Mapping stays Direct.
- **Adapter** — per-site logic that locates response containers and reports Chunks and stream end. Two tiers: **tuned** adapters built from live DOM measurement (claude.ai, chatgpt.com) and a **generic** adapter (growth heuristic, quiescence end) shared by every other registered site. The site list lives in `src/sites.ts`.
