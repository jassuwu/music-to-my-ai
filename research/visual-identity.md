# Visual identity for Music to My Agents

Research date: 2026-08-19. Method: primary-source product and vendor pages (teenage.engineering, Apple Support font manifests, developer.chrome.com, w3.org/WAI), plus documented design write-ups for hardware references, plus direct local verification of installed macOS font families (`ls /System/Library/Fonts*`) and locally computed WCAG contrast ratios for every hex pair proposed here.

Scope: the 288px toolbar popup (`src/popup/popup.html`, `src/popup/popup.ts`) and the Chrome icon set. Nothing here changes the Mapping, the Instrument roster, or any tuned constant — [Control surface](../tracker/tickets/0004-sound-packs-and-control-surface.md) already fixed what the popup contains. This fixes only how it looks.

---

## TL;DR / Recommendation

Build the popup as a **pocket-operator panel with 808 colour logic**: Teenage Engineering's Pocket Operator gives the proportion, the silkscreen labelling and the "screen reacts to the sound" trick; the Roland TR-808 gives one rule — a control that is currently making sound is *lit*, in a saturated warm orange, and everything else is ink-on-black. Reject Eurorack, cassette/tape and tracker/DAW chrome outright (reasons in §1.3).

- **Palette (dark, fixed, no light mode):** `--bg #0E0E10`, `--panel #17171B`, `--line #2A2A31`, `--line-strong #3A3A44`, `--text #F2F0EC`, `--dim #8F8C94`, `--accent #FF7A1A` (control/lit), `--signal #5FE3A1` (motion only, never a control). Every text pair clears WCAG 1.4.3 AA at the sizes used — worst case is `--dim` at 5.83:1 on `--bg` (§2.3).
- **Type:** condensed grotesque, uppercase, tracked out, for every label — `"Avenir Next Condensed", "Arial Narrow", "Roboto Condensed", system-ui, sans-serif`; Menlo/Consolas monospace for every number, domain and keycap. No body-copy sans anywhere. This also kills the popup's current text-overflow ellipsis on "Acoustic Guitar" / "Electric Guitar" (§3.4).
- **Logo:** **Tine comb** — an orange rounded square with four uneven black rounded bars (a kalimba comb, a level readout, four lines of arriving text). SVG given in §4.1. Recommended over three alternatives in §4.2–4.4.
- **Motion:** exactly two responses — the header mark's bars strike in time with the 3-note audition, and the picked cell shows a 240ms strike flash on its top edge. Nothing else moves. §5.

---

## 1. Aesthetic direction

### 1.1 Reference 1 — Teenage Engineering Pocket Operator / OP-1 (take the proportion, the labelling, and the reactive screen)

The PO is the closest real object to this popup: a device roughly the size of a 288px panel, with a handful of controls, one small display, and no case. Teenage Engineering's stated construction logic is that "all vital and sensitive components [sit] under the LCD display [so] there's no need for an outer case," and the display area "doubles as a speaker box" — the whole product is one flat plane with a display zone and a control zone and nothing in between ([teenage.engineering/products/po](https://teenage.engineering/products/po)). Every PO is "a bare PCB with a stand, 23 buttons, 2 dials and a screen" ([Wikipedia: Pocket Operators](https://en.wikipedia.org/wiki/Pocket_Operators)). The design philosophy is routinely described as refusing to hide the engineering — exposed screws, monospaced type, raw materials, interfaces that celebrate limitation ([Blake Crosley, "Teenage Engineering: Constraints as Aesthetic"](https://blakecrosley.com/guides/design/teenage-engineering)); on the OP-1 specifically, colour coding is what makes a complex instrument feel simple, by aligning the physical and on-screen interfaces to the same colour key ([Kostiuk, "The Product Design of Teenage Engineering"](https://medium.com/@ihorkostiuk.design/the-product-design-of-teenage-engineering-why-it-works-71071f359a97), [OP-1 original](https://teenage.engineering/products/op-1/original)).

**Borrow:**
- **Two zones, one plane.** A small identity/display strip at the top (mark + wordmark + power) and a dense control block below it, with hairline rules doing the separating instead of cards and shadows.
- **Silkscreen labelling.** Micro-scale (10px) uppercase condensed labels with wide tracking, set in `--dim`, each followed by a hairline rule that runs to the right edge — the way a panel section header is silkscreened. This is the single cheapest change that stops the popup reading as a settings page.
- **A product code.** `MTMA · 01` in monospace `--dim` in the header. POs carry model numbers (PO-12, PO-14, PO-33) as part of the identity; a version-shaped string does the same job here for free, and it's honest — this is a personal build, not a store product.
- **A screen that reacts to sound.** The PO's custom segmented LCDs animate to the beat. That is the ancestor of §5's audition feedback: the mark in the header is the "screen", and it strikes when a note plays.

**Do not borrow:** exposed-PCB texture (green solder mask, copper traces, silkscreen component designators). Rendering fake PCB at 288px is decoration with no function and reads as a wallpaper, not a panel.

### 1.2 Reference 2 — Roland TR-808 step row (take exactly one rule: lit = sounding)

The 808's panel was "decked out in a color scheme of black, white, orange, yellow, and red" that "would itself become world-famous, seen on everything from posters to headphones to sneakers" ([Patch & Tweak](https://www.patchandtweak.com/the-immortal-tr-808-an-icon-of-analog-sound-and-fashion/)). Its TR-REC system gave each step its own button with an LED inside it, so a lit button meant *this beat will fire* — "instant visual feedback" ([Sound On Sound, Roland TR-808](https://www.soundonsound.com/reviews/roland-tr808)).

**Borrow:** one rule and one colour. The instrument grid is a voice-select row on a drum machine: the selected cell is a *lit button* — solid `--accent` fill, `--bg` text, 7.39:1 — and every other cell is unlit ink-on-panel. That single inversion carries the entire state model of this popup (which voice is live), which is why nothing else in the UI needs to be coloured.

**Do not borrow:** the 808 panel wholesale. Roland has filed trademarks on the TR-808's design ([Resident Advisor](https://ra.co/news/43237)) — the orange/red/yellow row of pads with its grey chassis is identifiable trade dress, and reproducing it in a *text-sonifier* popup that has no sequencer, no steps and no drums is pastiche: it promises a grid of 16 steps the product cannot deliver. Take the lit-button logic, not the layout, and use one accent rather than the 808's four so the borrowing reads as influence rather than costume.

### 1.3 Rejected, with reasons

- **Eurorack / modular patch aesthetic.** Panel graphics are literally jack-and-knob positioning diagrams — pot scales, division lines, captions, logos, laid out around real hardware positions in Illustrator/Inkscape, usually white silkscreen on black ([Synth DIY wiki: Eurorack panel components](https://sdiy.info/wiki/Eurorack_panel_components), [SyntherJack: Eurorack DIY graphics](https://syntherjack.net/eurorack-module-diy-tutorial-2-graphics/), [eurorack-blocks: ordering panels](https://eurorack-blocks.readthedocs.io/en/latest/diy/order-assemble.html)). The aesthetic is inseparable from patch points and cables. This popup has four controls and no routing; drawing jacks that patch nothing is the most obvious kind of lying decoration. *Its one transferable idea — white condensed silkscreen labels on black — is already taken via §1.1.*
- **Cassette / tape deck.** Tape imagery is a transport metaphor: reels, play, pause, rewind, record. This product has no transport — the stream is driven by the model, not the user, and the only urgent control is "stop now", already bound to a keyboard shortcut. A reel that isn't a control is a lie about what the UI does.
- **Tracker / DAW UIs.** Trackers are dense monospace grids for *editing time*, and their revival themes (Impulse Tracker "Vintage", "Industrial" greys, ScreamTracker "Gold", CRT-mono-green) are ports of full 80×25 pattern editors ([joecola/renoise-themes](https://github.com/joecola/renoise-themes), [Renoise forum: Impulse Tracker theme](https://forum.renoise.com/t/theme-for-impulse-tracker-streamtracker/14013)). At 288px with four controls, tracker chrome degrades straight back into "dark information-dense config UI" — the exact failure being fixed. *One idea survives: monospace for numerals, taken in §3.2.*
- **VU meters and knurled knobs.** Bevels, needles, glass and brushed metal are 3D skeuomorphic rendering, which at 16px popup scale reads as 2008 desktop-widget pastiche, and a needle VU implies a continuous level that the popup has no access to while it's open (the stream is in a tab, the popup is not). Rejected on both taste and honesty.
- **Oscilloscope / waveform motifs.** Kept, but demoted to a *colour* and a *shape*, not a surface: P31 — the short-persistence (<1ms) green phosphor used in essentially every analogue scope from the 1970s onward — supplies `--signal`, and its short persistence is the right metaphor for a one-shot chunk hit ([TubeTime: CRT phosphor video](https://tubetime.us/index.php/2015/10/31/crt-phosphor-video/), [Oscilloclock: phosphor](https://oscilloclock.com/archives/tag/phosphor)). A live scrolling trace in the popup would be fake (nothing is streaming while the popup is focused) and would compete with the controls.

---

## 2. Colour

### 2.1 The palette

```css
:root {
  --bg:          #0E0E10;  /* panel substrate — warm near-black, no blue cast */
  --panel:       #17171B;  /* unlit cell / inset field */
  --line:        #2A2A31;  /* silkscreen hairline rules, dividers */
  --line-strong: #3A3A44;  /* unlit cell border, slider slot */
  --text:        #F2F0EC;  /* silkscreen ink — warm off-white, never #FFF */
  --dim:         #8F8C94;  /* labels, values, inactive domains */
  --accent:      #FF7A1A;  /* LIT: selected voice, power on, focus ring */
  --signal:      #5FE3A1;  /* MOTION ONLY: the strike flash. Never a control. */
}
```

### 2.2 Why these, against the current values

The popup today runs `#14161c / #1d202a / #2a2e3a / #e7e9ee / #949aab / #ffc978`. Its problem is not contrast — it's that every neutral is **blue-tinted slate** (hue ≈ 225°), which is the default hue of every dashboard, IDE sidebar and admin panel built in the last decade. Hardware panels are not blue; the 808 is black-white-orange-yellow-red, PO faceplates are black solder mask with white silkscreen. Dropping the blue and going warm-neutral (hue ≈ 260° at ~4% saturation, effectively neutral) is what converts "dark app" into "equipment". Contrast is preserved, not sacrificed: the new `--text` is 16.94:1 vs the old 15.7:1-class value.

`--accent #FF7A1A` is the 808's orange pushed to full saturation. It is deliberately *hotter* than claude.ai's terracotta (~`#D97757`) so the extension never looks like a Claude sub-brand, and it is not green, so it never reads as a ChatGPT accent either. `--text #F2F0EC` is warm rather than neutral because silkscreen ink on black hardware is never a pure cold white.

`--signal #5FE3A1` exists for one job (§5) and appears nowhere else. Two accents is the ceiling: the OP-1's colour coding works because each colour *means* one thing. Here orange means "this is live" and green means "a note just fired". A third accent would be decoration.

### 2.3 Contrast (WCAG 2.2 SC 1.4.3: 4.5:1 for text under 18.5px bold / 24px, 3:1 above — [W3C Understanding SC 1.4.3](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html))

Every string in this popup is 10–13px, i.e. **normal text**, so the 4.5:1 bar applies throughout — the 3:1 large-text allowance is unavailable here. Ratios computed locally (sRGB relative luminance, WCAG formula):

| Pair | Where | Ratio | AA |
|---|---|---|---|
| `--text` on `--bg` | wordmark, instrument names | **16.94:1** | pass |
| `--text` on `--panel` | text inside unlit cells | **15.71:1** | pass |
| `--dim` on `--bg` | 10px section labels, footer | **5.83:1** | pass |
| `--dim` on `--panel` | value readouts in inset fields | **5.40:1** | pass |
| `--accent` on `--bg` | lit indicators, focus ring | **7.39:1** | pass |
| `--bg` on `--accent` | text in the lit cell | **7.39:1** | pass |
| `--signal` on `--bg` | strike flash | **11.93:1** | pass |
| `--line` on `--bg` | hairline rules | 1.35:1 | decorative — see below |
| `--line-strong` on `--bg` | unlit cell border | 1.72:1 | decorative — see below |

The two sub-threshold values are intentional and compliant. SC 1.4.11 (non-text contrast, 3:1) applies to the visual information *needed to identify* a component and its state. Here the cell is identified by its 15.71:1 label and its state by a full fill inversion at 7.39:1, so the border is ornament, not information — pushing it to 3:1 (≈ `#5E5E6D`) would turn the panel into a wireframe. Keyboard focus is carried by a 2px `--accent` ring at 6.85:1 on `--panel`, well over the 3:1 requirement.

The old `--dim #949aab` was 6.43:1 and the new one is 5.83:1: slightly dimmer, still comfortably clear of 4.5:1 at 10px, and the drop is what buys the "labels recede, controls advance" hierarchy a panel needs.

---

## 3. Typography

No font files ship. Everything below resolves from fonts already installed.

### 3.1 Labels, wordmark, instrument names — condensed grotesque, uppercase, tracked

```css
--font-label: "Avenir Next Condensed", "Arial Narrow", "Roboto Condensed",
              system-ui, sans-serif;
```

Avenir Next Condensed ships with macOS in twelve faces (Ultra Light → Heavy, with italics) — confirmed in Apple's own manifest ([Fonts included with macOS Sequoia](https://support.apple.com/en-us/120414)) and verified present on this machine (12 faces in `/System/Library/Fonts/Supplemental`). Arial Narrow is the fallback: also present locally (4 faces) and installed by default on Windows, so the popup degrades to a genuine condensed neo-grotesque rather than to Helvetica. Roboto Condensed covers ChromeOS/Android/Linux.

Condensed uppercase with 0.10–0.14em tracking at 10–12px *is* the silkscreen look — it's what's actually printed on Eurorack panels and drum-machine chassis. Set at weight 600 for the wordmark and section labels, 500 for instrument names.

### 3.2 Numbers, domains, keycaps — monospace

```css
--font-mono: Menlo, Consolas, "DejaVu Sans Mono", "Liberation Mono", monospace;
```

Do **not** use `ui-monospace` as the first entry: it is CSS Fonts Level 4 and is still Safari-only, so in a Chrome popup it silently falls through ([qwtel: The Monospaced System UI CSS Font Stack](https://qwtel.com/posts/software/the-monospaced-system-ui-css-font-stack/), [system-fonts/modern-font-stacks](https://github.com/system-fonts/modern-font-stacks), [CSS-Tricks: System Font Stack](https://css-tricks.com/snippets/css/system-font-stack/)). Name the platform faces explicitly. Menlo is verified installed locally; SF Mono is not addressable from CSS (it ships inside Terminal.app, not `/System/Library/Fonts`), so do not name it.

Monospace is used for exactly four things: the volume readout (`60%`), the two site domains (`claude.ai`, `chatgpt.com` — they are literal strings, so they should be set as literal strings), the shortcut keycap, and the `MTMA · 01` product code. Keep `font-variant-numeric: tabular-nums` on the readout so dragging the fader doesn't shift the layout.

### 3.3 What not to use

Delete the `ui-sans-serif, -apple-system, "Segoe UI"` body stack entirely. There is no body copy in this popup — every string is a label, a value or a control name. Leaving a UI-sans default in place is what makes the panel read as a settings page.

### 3.4 A functional side effect

Instrument cells are `(288 − 32 − 6) / 2 = 125px` wide, ~107px of content box. "Acoustic Guitar" and "Electric Guitar" at 13px system sans measure ~98px and currently rely on `text-overflow: ellipsis` to survive. The same strings as `ACOUSTIC GUITAR` in Avenir Next Condensed at 10.5px with 0.06em tracking measure ~72px. The condensed uppercase treatment is not only more in character, it removes a live truncation risk from the busiest control on screen.

### 3.5 Scale

| Role | Font | Size | Case / tracking |
|---|---|---|---|
| Wordmark | label, 600 | 12px | UPPER, 0.10em |
| Product code | mono | 9px | `MTMA · 01`, `--dim` |
| Section label | label, 600 | 10px | UPPER, 0.14em, `--dim` |
| Instrument name | label, 500 | 10.5px | UPPER, 0.06em |
| Site domain | mono | 11px | lowercase literal |
| Volume value | mono | 11px | tabular |
| Footer / keycap | label / mono | 10px / 10px | UPPER / literal |

---

## 4. Logo

Chrome needs 16 (page favicon), 48 (chrome://extensions) and 128 (install + store), and will scale for anything else; PNG only, no SVG or WebP ([Chrome: icons manifest key](https://developer.chrome.com/docs/extensions/reference/manifest/icons)). The 128 asset should place ~96×96 of artwork inside 16px of transparent padding, avoid a border around the full canvas, avoid heavy drop shadows, face the viewer with no perspective, and work on both light and dark backgrounds ([Chrome Web Store: images](https://developer.chrome.com/docs/webstore/images)). Author 16 and 32 by hand on the pixel grid; do not downscale 128.

### 4.1 **Concept A — "Tine comb" (RECOMMENDED)**

A solid `--accent` rounded square carrying four black rounded-cap vertical bars of *uneven, non-monotonic* height. It is simultaneously a kalimba comb (the default voice, and no other extension's icon is a kalimba), a level readout, and four lines of text that arrived at different lengths. The uneven heights are load-bearing: a monotonic ascending three- or four-bar shape is the cellular-signal glyph, which is a fatal collision in a browser toolbar. The non-monotonic profile (medium / tall / short / mid) reads as audio.

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" width="128" height="128">
  <rect x="16" y="16" width="96" height="96" rx="24" fill="#FF7A1A"/>
  <g fill="#0E0E10">
    <rect x="28" y="68" width="12" height="24" rx="6"/>
    <rect x="48" y="36" width="12" height="56" rx="6"/>
    <rect x="68" y="76" width="12" height="16" rx="6"/>
    <rect x="88" y="54" width="12" height="38" rx="6"/>
  </g>
  <!-- 128 and 48 only: the strike tick on the tall tine -->
  <rect x="42" y="41" width="24" height="5" rx="2.5" fill="#FFF6EC"/>
</svg>
```

Size variants:
- **128** — as above. Artwork 96×96 in 16px padding, exactly to Chrome's spec.
- **48** — same geometry, padding reduced to 5px (artwork 38×38); keep the strike tick.
- **32** — same geometry, padding 3px; **drop the strike tick** (it lands at ~1.2px).
- **16** — redraw on the pixel grid: a 16×16 orange square, `rx: 3`, with **three** bars (drop the shortest), each 3px wide with 2px gaps, block heights 5 / 10 / 7 px, bottoms aligned at y=13. Total bar run 13px, centred. Four bars at 16px means sub-2px strokes and mush.

Contrast behaviour: the black-on-orange bars are 7.39:1, so the mark's *identity* is legible in every context. The orange plate is 5.50:1 against Chrome's dark toolbar (#292A2D) and 2.34:1 against the light one (#F1F3F4) — the light case is the weaker silhouette, but it's a large solid mass, not a hairline, and the internal 7.39:1 carries it. If it proves soft in practice, add a 4px `#0E0E10` keyline just inside the plate edge on the 128 and 48 assets only (it falls below a pixel at 16). Note that #FF7A1A is far more saturated than claude.ai's terracotta favicon, so the two do not confuse.

The mark is reusable *inside* the product: the same four bars sit at 18px in the popup header and are the thing that animates in §5. Logo and feedback are the same object, which is the OP-1's colour-coding trick applied to shape.

### 4.2 Concept B — "Streaming caret"

A solid `--accent` block caret (the terminal/LLM streaming cursor) on the left, with three `--signal` vertical scope ticks of descending height trailing off to its right, all on a `--bg` rounded square. Reads literally as "text is arriving, and it is making a signal". Precise: plate 96×96 rx24 `#0E0E10`; caret `rect x=28 y=34 w=18 h=60 rx=3` fill `#FF7A1A`; ticks `rect w=6 rx=3` at x=56/70/84 with heights 40/28/16, bottoms aligned at y=94, fill `#5FE3A1`.
**Rejected:** two ideas at 16px is one too many. The caret block collapses into "a rectangle" and the ticks into a smear, and it needs both accents at icon scale, which breaks the one-colour-one-meaning rule.

### 4.3 Concept C — "Struck tine"

A single tall tine, slightly bowed, with two concentric arcs radiating from its tip and a square anchor block at its base — a kalimba tine caught mid-ring. Precise: plate `#0E0E10`; tine as a `path` from (52,92) curving to (60,32), stroke `#F2F0EC` 10px round cap; anchor `rect x=36 y=88 w=44 h=10 rx=3` fill `#FF7A1A`; arcs as two `path` arcs at radii 16 and 28 centred on the tip, stroke `#FF7A1A` 6px and 5px, each spanning ~70°.
**Rejected:** the arcs are the wifi/broadcast/volume glyph. At 16px this becomes a generic "sound is emitting" icon and loses the kalimba entirely.

### 4.4 Concept D — "Chunk step"

Four square outline cells in a row, 808-style, with the third filled `--accent` and a short vertical stroke rising out of its top — "one note per chunk, arriving in sequence". Precise: plate `#0E0E10`; four `rect w=18 h=18 rx=3` at x=20/42/64/86, y=64, stroke `#3A3A44` 2px; third rect filled `#FF7A1A` no stroke; stroke `rect x=71 y=36 w=4 h=26 rx=2` fill `#FF7A1A`.
**Rejected:** the strongest concept at 16px legibility, but four cells with one filled is the universal *progress / battery / page-dots* pattern. It also over-promises a sequencer the product doesn't have — the same pastiche trap as §1.2.

### 4.5 Also considered and dropped

A glyph dissolving into grains (a letterform whose right side breaks into dots) — the correct metaphor, unreadable below 48px. And any plain music note or eighth-note-plus-speech-bubble, per the brief and because it says "music app", not "this thing performs your stream".

---

## 5. Motion and feedback

Two responses. Both are triggered only by an explicit user action, both settle inside 400ms, and neither runs on a loop — a popup that idles with animation is a gimmick, and one that animates the whole surface makes the controls harder to hit.

**5.1 The header mark strikes with the audition.** Put the §4.1 four-bar mark in the header at 18px as inline SVG. `popup.ts` already schedules the audition as three notes at `ctx.currentTime + i * 0.13`. Mirror that: on `click`, animate bars 2, 4, 1 in sequence at 0/130/260ms, each doing `transform: scaleY(1 → 1.35 → 1)` with `transform-origin: bottom`, 40ms attack / 240ms decay on `cubic-bezier(.2,.7,.3,1)`, and a simultaneous `fill: #0E0E10 → #FFF6EC → #0E0E10` on the struck bar only. The mark behaves like a Pocket Operator's segmented LCD reacting to the beat, which is the single most alive-feeling thing about that hardware, and it teaches the icon's meaning the first time the user picks a voice. Total motion footprint: 18px square, in the corner, away from every control.

**5.2 The picked cell shows a strike flash.** On selection, the lit cell's 2px top edge goes `--signal` and fades to transparent over 240ms `ease-out`, while the cell itself does `translateY(1px)` for 60ms — a button being pressed, with the phosphor's short persistence as the decay. This is the only place `--signal` is ever used, which is what makes it read as "a note fired" rather than as a second brand colour. P31's sub-1ms persistence is exactly the "one hit, no smoothing" character the Direct mapping settled on ([TubeTime](https://tubetime.us/index.php/2015/10/31/crt-phosphor-video/)).

**Explicitly not doing:** a live waveform or scope trace (nothing is streaming while the popup has focus, so it would be fabricated); a VU needle; a per-note ripple or particle; any transition on the volume fader (it must track the pointer 1:1 — the code already ramps the audio with a 20ms `setTargetAtTime`, and the visual should have no lag at all); any animation on open.

**Guard both with `prefers-reduced-motion`** — under `reduce`, keep the colour change on the struck bar and the cell edge (state feedback survives) and drop every transform ([MDN: prefers-reduced-motion](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion)).

---

## 6. Applying it to the existing popup — the five edits that do the work

Ordered by character-per-line-changed. No new controls; [Control surface](../tracker/tickets/0004-sound-packs-and-control-surface.md) stands.

1. **Swap the six custom properties** for §2.1 and add `--line-strong`, `--signal`, `--font-label`, `--font-mono`. Delete the `ui-sans-serif` body stack.
2. **Section labels become silkscreen.** `h2` gets `--font-label`, 10px/0.14em, plus a `::after` hairline rule (`flex: 1; height: 1px; background: var(--line)`) running to the right edge. Four lines of CSS, biggest single shift in character.
3. **The toggles stop being iOS switches.** Square the track (`border-radius: 3px`), square the knob (14×14, `rx 2`), inset the slot with `--line-strong`, and make the ON state `--accent` track with a `--bg` knob. A hardware slide switch, not a phone setting.
4. **The range becomes a fader.** Style `::-webkit-slider-runnable-track` as a 3px `--line-strong` slot and `::-webkit-slider-thumb` as an 18×10 `--text` cap with `rx 2`; add five 1px `--line` graduation ticks beneath at 0/25/50/75/100 (a single repeating-linear-gradient). Drop `accent-color`.
5. **The instrument grid becomes a voice row.** Cells go `border-radius: 3px`, `border: 1px solid var(--line-strong)`, `--font-label` uppercase 10.5px; the selected cell is a solid `--accent` fill with `--bg` text (keep the existing `aria-pressed` hook), plus the §5.2 strike. Header gets the 18px mark, the wordmark in condensed caps, and `MTMA · 01` in mono.

---

## Sources

- [teenage engineering — pocket operators](https://teenage.engineering/products/po)
- [teenage engineering — OP-1 original](https://teenage.engineering/products/op-1/original)
- [Wikipedia — Pocket Operators](https://en.wikipedia.org/wiki/Pocket_Operators)
- [Blake Crosley — Teenage Engineering: Constraints as Aesthetic](https://blakecrosley.com/guides/design/teenage-engineering)
- [Ihor Kostiuk — The Product Design of Teenage Engineering: Why It Works](https://medium.com/@ihorkostiuk.design/the-product-design-of-teenage-engineering-why-it-works-71071f359a97)
- [Patch & Tweak — The immortal TR-808](https://www.patchandtweak.com/the-immortal-tr-808-an-icon-of-analog-sound-and-fashion/)
- [Sound On Sound — Roland TR-808 review](https://www.soundonsound.com/reviews/roland-tr808)
- [Resident Advisor — Roland files for trademarks on its TB-303 and TR-808 designs](https://ra.co/news/43237)
- [Synth DIY Wiki — Eurorack panel components](https://sdiy.info/wiki/Eurorack_panel_components)
- [SyntherJack — Eurorack module DIY tutorial (2): graphics](https://syntherjack.net/eurorack-module-diy-tutorial-2-graphics/)
- [eurorack-blocks — Ordering & assembling the front panel](https://eurorack-blocks.readthedocs.io/en/latest/diy/order-assemble.html)
- [joecola/renoise-themes — Impulse Tracker colour themes](https://github.com/joecola/renoise-themes)
- [Renoise forums — Theme for Impulse Tracker / ScreamTracker](https://forum.renoise.com/t/theme-for-impulse-tracker-streamtracker/14013)
- [TubeTime — CRT phosphor video (P31 characteristics)](https://tubetime.us/index.php/2015/10/31/crt-phosphor-video/)
- [Oscilloclock — phosphor archives](https://oscilloclock.com/archives/tag/phosphor)
- [Apple Support — Fonts included with macOS Sequoia](https://support.apple.com/en-us/120414)
- [qwtel — The Monospaced System UI CSS Font Stack](https://qwtel.com/posts/software/the-monospaced-system-ui-css-font-stack/)
- [system-fonts/modern-font-stacks](https://github.com/system-fonts/modern-font-stacks)
- [CSS-Tricks — System Font Stack](https://css-tricks.com/snippets/css/system-font-stack/)
- [W3C — Understanding SC 1.4.3 Contrast (Minimum)](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html)
- [Chrome for Developers — icons manifest key](https://developer.chrome.com/docs/extensions/reference/manifest/icons)
- [Chrome for Developers — Chrome Web Store images](https://developer.chrome.com/docs/webstore/images)
- [MDN — prefers-reduced-motion](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion)
