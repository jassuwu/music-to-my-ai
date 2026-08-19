# music to my ai

your ai talks, this plays it. one note per chunk of the reply, nothing to configure.

a chrome extension that plays streaming llm replies as tiny music. each piece of arriving text strikes one note — no smoothing, no loops, no music playing *alongside* the stream. the stream is the instrument.

## install

```
bun install
bun run build
```

then `chrome://extensions` → developer mode → load unpacked → pick `dist/`.

## works on

claude.ai and chatgpt.com get hand-tuned adapters built from live dom measurement. chatjimmy.ai, gemini, t3.chat, deepseek, grok, perplexity and mistral share a generic adapter that makes a stream prove itself before anything sounds (three growths in two seconds, never shrinking — timestamps and loading dots can't fake that). every site has its own checkbox in the popup.

## controls

six voices (kalimba is the default), one volume slider, per-site checkboxes, and a mute checkbox with a global shortcut (`⌘⇧M`). picking a voice plays it. that's everything.

## dev

```
bun run dev            # rebuild on change, reload manually in chrome
bun run build:harness  # tuning harness → prototypes/tuning-harness.html
```

no bundler framework, no plugins — `bun build` covers everything an extension needs. the `tracker/` directory is the project's map and decision log; `CONTEXT.md` is the glossary. the git history is the diary, including the day it had four names.

## credits

instrument samples extracted from [gleitz/midi-js-soundfonts](https://github.com/gleitz/midi-js-soundfonts) (fluidr3_gm render, mit). identity borrowed with permission from [jass.gg](https://jass.gg) — it's his tool.
