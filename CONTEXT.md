# Context

Glossary for Aux — a browser extension that turns streaming LLM responses into sound. ("Music to My Agents" was the working title and the repo directory still carries it; "Halo" was a one-day intermediate name.)

## Glossary

- **Aux** — the product's name, as in "pass the aux": the extension hands your AI the aux cord, and the reply plays as it streams. There is no visual identity beyond the name: the popup is native controls in the system font, and the icon is a plain white note on a dark tile.
- **Sonification** — turning the arrival of streamed response text into sound in real time.
- **Stream** — one assistant response while it is still growing on the page.
- **Chunk** — **one MutationObserver callback in which the Stream's text grew** — not one mutation record, and not a model token. Coalescing at the callback boundary is what makes the rate playable: measured live at 4.8/sec on claude.ai and 6.6/sec on chatgpt.com, where per-record firing would burst dozens of notes in a single millisecond. Chunk size varies wildly (median 3–33 chars, up to 5,405 when a code block flushes).
- **Mapping** — the rule set translating Chunks into sound. Settled as **Direct**: exactly one sound per Chunk, fired on arrival, never smoothed or rescheduled. There is only one Mapping; the discarded "Sound Pack" idea (switchable bundles of alternative Mappings) is retired.
- **Voice** — the character of a single chunk-hit: timbre, envelope, register, and space. Settled per instrument; Kalimba-like warmth is the default.
- **Instrument** — the user-selectable sound source a Voice is built on (piano, guitar, sitar, harp, …). The only thing the user may swap; the Mapping stays Direct.
- **Adapter** — per-site logic that locates response containers and reports Chunks and stream end. v1 has two: claude.ai and chatgpt.com.
