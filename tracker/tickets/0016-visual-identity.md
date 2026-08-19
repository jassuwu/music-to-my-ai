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
