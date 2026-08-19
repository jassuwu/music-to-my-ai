# chrome web store listing

Paste-ready copy for the Developer Dashboard. Every field the submission form
asks for is below, in the order the form asks for it. Character limits are the
store's, and each string here is already under its limit.

## store listing tab

**item name** (45 max, currently 14)

```
music to my ai
```

**summary** (132 max, currently 96, and it must match manifest.json's `description`)

```
your ai talks, this plays it. one note per chunk of the reply, nothing to configure.
```

**description** (16,000 max)

```
your ai talks, this plays it.

every chunk of a streaming reply strikes one note as it lands. nothing loops, nothing plays over the top. the stream is the instrument, so a long answer is a long piece of music and a one-liner is a single ping.

what's in the popup:
- six voices: kalimba, piano, acoustic guitar, bass, harp, sitar. picking one plays it.
- one volume slider.
- a checkbox per site, all on by default.
- mute, with a shortcut (⌘⇧M on mac, ctrl+shift+m elsewhere).

that's everything. there is no account, no onboarding, and nothing else to set.

where it works:
claude.ai and chatgpt.com are hand-tuned. the timing came from measuring how their pages actually render text. chatjimmy, gemini, t3.chat, deepseek, grok, perplexity and mistral share a generic reader that makes a stream prove itself before it plays anything, so loading dots and clock ticks stay silent.

privacy, in full: it collects nothing and sends nothing. there is no server. your settings live in your browser's own storage, the instrument samples ship inside the extension, and the extension makes no network requests at all.

open source, mit: https://github.com/jassuwu/music-to-my-ai
```

**category**: Fun
**language**: English
**homepage url**: https://jassuwu.github.io/music-to-my-ai
**support url**: https://github.com/jassuwu/music-to-my-ai/issues

### graphics

| asset | size | status |
| --- | --- | --- |
| store icon | 128×128 | `assets/icons/icon-128.png` |
| screenshots (1–5, at least one) | 1280×800 | **you have to take these**, see below |
| small promo tile | 440×280 | `store/promo-440x280.png` |
| marquee promo tile | 1400×560 | `store/promo-1400x560.png` |

Screenshots are the one thing that can't be generated. They have to be the
real thing on a real page. Four worth taking, in this order (the first is the
one that shows in search results):

1. a chat mid-reply on claude.ai with the popup open beside it.
2. the popup alone, close up, light mode.
3. the popup alone, dark mode. (Same popup. It follows the system theme, and
   showing both is the cheapest way to say so.)
4. chrome://extensions with the shortcut visible, or a second site streaming.

macOS: `⌘⇧4` then space captures a window at retina scale; a 1280×800 window
comes out 2560×1600, so scale it back down to 1280×800 before upload.

## privacy tab

**single purpose**

```
plays one note each time a streaming ai reply grows, so you can hear a response arrive.
```

**permission justification, storage**

```
stores the chosen instrument, volume, mute state and the per-site on/off toggles, so the popup looks the same next time. nothing else is stored, and nothing is sent anywhere.
```

**permission justification, host permissions**

```
the extension has to watch the assistant's reply as the page renders it, because the arrival of text is what it turns into sound. on each listed chat site it observes the length of the reply element and nothing more. text is never read for meaning, never stored, and never transmitted. the sites are listed one by one rather than requested broadly, and each has its own checkbox in the popup.
```

**data usage disclosures**: tick nothing. Then certify all three statements:
no selling data, no use unrelated to the single purpose, no creditworthiness
or lending. A privacy policy URL is not required while nothing is collected.

## distribution tab

Public, all regions, free. No trader status if this is a personal toy, but
answer the trader question honestly. The EU rules turn on whether you're
acting commercially, not on whether the item is paid.

## after submission

Review is usually a few days; a first submission from a new account can take
longer. Host permissions on 13 domains are the part that draws a human, and the
justification above is written for that reader.

Updates: bump `version` in `manifest.json`, `bun run package`, upload the new
zip to the same item. The version has to increase or the upload is rejected.
