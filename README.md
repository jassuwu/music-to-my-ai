# music to my ai

your ai talks, this plays it. one note per chunk of the reply, nothing to configure.

a chrome extension that turns a streaming llm answer into music while it arrives. every piece of text that lands strikes exactly one note. no loops, no backing track, nothing playing alongside the stream. the stream is the instrument.

[hear it before you install it](https://music-to-my-ai.jass.gg). the demo on that page runs this repo's engine, not a recording.

## works on

claude.ai and chatgpt.com have hand-tuned adapters, built by measuring their live dom. chatjimmy, gemini, t3.chat, deepseek, grok, perplexity and mistral share a generic one that makes a stream prove itself before anything sounds: three growths in two seconds, never shrinking. timestamps and loading dots can't fake that. every site gets its own checkbox.

## controls

six voices, one volume slider, per-site checkboxes, mute with a shortcut (`⌘⇧M`). picking a voice plays it. that's the whole popup.

## build it yourself

```
bun install
bun run build     # dist/, load unpacked at chrome://extensions
bun run check     # manifest, sites, samples and versions agree
bun run package   # a zip anyone can unzip and load unpacked
bun run site      # dist-site/, the demo page
```

releasing is a tag. bump the version in `manifest.json` and `package.json`, push `v1.2.3`, and the workflow builds the zip and cuts the release with it. a tag that disagrees with the manifest fails instead of shipping. ci runs the same checks on every push, and hangs the built zip off each one so a branch can be installed without cloning it.

no bundler framework, no plugins. `bun build` does everything an extension needs. `tracker/` is the decision log, `CONTEXT.md` the glossary, and the git history is a diary that includes the day this thing had four names.

## credits

samples from [gleitz/midi-js-soundfonts](https://github.com/gleitz/midi-js-soundfonts) (fluidr3_gm render, mit). look and voice lifted from [jass.gg](https://jass.gg), because it's his tool.
