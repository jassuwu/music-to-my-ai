---
id: 16
title: Visual identity
labels: [wayfinder:prototype]
status: open
assignee: jass
blocked-by: []
---

## Question

The popup works and is deliberately simple, but it looks like a settings panel rather than an instrument. It needs character without losing the simplicity, plus the icon set the extension currently lacks entirely.

- **Aesthetic direction.** What visual language signals "this makes sound" at 288px wide? Hardware synth panels, drum machines, tracker and DAW interfaces, tape decks, Teenage Engineering's pocket operators are the obvious reference points. Which two or three suit a playful personal toy, and what specifically is worth borrowing (proportion, labelling, control shapes, texture) rather than copying as pastiche?
- **Colour and type.** A concrete palette for a dark popup, and font stacks that carry character without shipping font files.
- **Logo.** A mark that works at 16, 32, 48 and 128px, reads at toolbar size, and connects streaming text with sound. Not a plain music note.
- **Feedback.** One or two small responses that make auditioning an instrument feel alive without competing with the controls.

Research is running in the background; findings land in `research/visual-identity.md`. Resolved when the popup and icons are rebuilt against a chosen direction the user likes.

## Implementation note

Direction taken from [../../research/visual-identity.md](../../research/visual-identity.md): a Pocket Operator panel with one rule borrowed from the TR-808 — the thing currently making sound is lit, everything else is ink on black. Eurorack, tape and tracker references were rejected in the research (patch points and transports this product doesn't have; tracker density collapses back into config-UI at 288px).

Landed: the palette (warm near-black `#0E0E10`, orange `#FF7A1A` reserved for the lit state, green `#5FE3A1` reserved for motion), condensed uppercase silkscreen labels with hairline rules, monospace for numbers/domains/keycap, hardware slide switches instead of iOS toggles, a fader with graduation ticks instead of a styled range input, the voice grid as lit/unlit cells, and the Tine comb mark at four icon sizes plus 18px in the header where it strikes in time with the audition. Motion is guarded by `prefers-reduced-motion`.

Could not be rendered locally for review (no Chromium binary available to drive headlessly); the 16px icon was verified by pixel dump. **Open pending the user's eyes.**

### Second pass

The first pass was a skin: palette, type and control shapes changed, but the layout was still header / label / control / label / control, which is the shape of a settings form. Character has to come from structure, not decoration.

Rebuilt around the comb. The voice picker is now six tines you strike rather than a grid you configure, laid out like a real kalimba: length follows the instrument's register (bass longest, harp shortest) and the lowest sits centre with the rest alternating outward, producing the arch. So the comb is a picture of the roster's pitch range rather than an ornament. Striking a tine picks the voice, plays it, and flashes its name in the readout below in phosphor green before settling to orange. Section headings are gone entirely — the fader carries a silkscreen `VOL`, and the sites are lamps rather than a labelled list.

### Third pass: the restart

The user's verdict on both passes was the same: still a settings screen, "not like a divine, flairful thing", and the brief was widened to a full restart. New name, new logo, new colour, new feeling, with divine-ness and simplicity as the target words. The hardware-panel direction itself was the mistake, not its execution. Pocket operators are workshop objects; the brief wanted something sacred.

**The name is Halo.** It is the ring of light around something sacred, and the word audio engineers already use for the shimmer a note leaves hanging in the air (a "reverb halo"). The extension puts a halo of sound around the machine's words. One word, no explanation needed, and the logo falls out of it for free. Runners-up, recorded so the choice is cheap to veto:

- *Antiphon* — the sung reply in call-and-response liturgy, which is exactly what a chat is. Deepest meaning of the set, but it needs explaining, and the brief said simplicity.
- *Psalm* — a sacred song. Right feeling, no obvious mark.
- *Grace Notes* — the small quick ornamental notes each Chunk-hit literally is, plus divine grace. Loveliest pun, weakest as a product name.

The working title "Music to My Agents" is retired. The repo directory keeps the old name; renaming a local folder buys nothing.

**The mark** is a single luminous ring on warm darkness: halo and soundwave in one shape. At 128px it carries a fainter outer ripple and an ember at the heart; at 16px it reduces to one bright gold ring, which survives the toolbar where the comb's four bars smeared. Per-size SVGs rendered with ImageMagick. Its MSVG renderer silently drops any stroke without an explicit `stroke-opacity`, so every stroke states one.

**The palette** is candle-gold on warm night: night `#0B0908`, gold `#E8C170`, hot core `#FFF0CE`, ivory text `#EDE6DA`, warm dim `#93887A`, ember `#4A3B21` for unlit states. Divine, as a visual language, means darkness with one source of light. The orange/green hardware pair is gone.

**The type** is a humanist serif (Iowan Old Style, Palatino, Georgia stack — no shipped font files), replacing condensed silkscreen caps and monospace. The voice name is the largest thing on the panel, set in serif like a title page.

**The structure**: the halo is the interface. The six voices are lights sitting on the ring, placed by register — bass at the base, pitch rising around both flanks, harp at the zenith — computed from the instruments' base notes, the same honesty the comb had, now celestial. Striking a light picks the voice, plays it, and the halo ripples outward. The heart of the ring is sound on/off; muted, the halo goes dark. Volume is one hairline with a gold dot; the sites are two quiet lamps; the mute shortcut sits alone in the footer.

**The copy voice** is quiet declaratives in sentence case. Manifest: "A halo of sound for streaming AI answers. One note for each piece of the reply as it arrives."

Fixed constraints honoured, not relitigated: Direct mapping, kalimba default, the 6-voice roster, the ticket-0004 control set (voice, volume, per-site toggles, mute shortcut, nothing else), 288px popup, `prefers-reduced-motion`, no in-page UI.

**Open pending the user's eyes.**
