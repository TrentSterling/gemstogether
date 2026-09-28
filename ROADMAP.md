# Roadmap

Every idea from the 2026-09-28 playtest thread on Discord, plus Tront's calls. Research backing: `research/TETRIS-EFFECT-DEEP-DIVE.md` (short pass; a deeper research handoff is coming from a separate run).

## 0. Andre's feedback (the north star)

Tront: "log andres feedback its basically our north star to impress him". Andre plays it, spots real bugs and has the taste call. Every item he raises goes here first.

| When | Andre said | Status |
|---|---|---|
| 09-28 02:36 | the "it's over 9000" reference has to go | done (patch 5) |
| 09-28 02:36 | next: ambient music, and a background that animates like a journey | done (patches 7, 8, 14) |
| 09-28 02:39 | add gamepad support | done (patch 9) |
| 09-28 02:40 | hold-and-drag nearly gave him carpal tunnel | partly (pad and keyboard play, patch 9); click-swap discoverability still open |
| 09-28 02:43 | stages and themes like Tetris Effect + meta progression + online co-op + a banger soundtrack = sells on Steam | stages, co-op, soundtrack done; meta progression open |
| 09-28 02:43 | zen/endless should switch stage, background, theme and music every XX points | done (patch 8) |
| 09-28 02:45 | some kind of fail state, "out of moves" | done as an option (patch 13) |
| 09-28 02:46 | combos need to feel like "ooh yes I got a freaking 5x combo!" | done (patches 6, 15) |
| 09-28 02:46 | do a deep dive on Tetris Effect or Lumines Arise | done (research/) |
| 09-28 14:11 | Animation speed isn't saved in settings | fixed (patch 17) |
| 09-28 14:14 | "cool dynamic music... the increase in intensity and layering is cool, **it should probably not drop back to base layer so quickly once a higher layer is reached**" | done (patch 18: layers latch and step down) |
| 09-28 14:14 | "I'm not sure about the speed up" (the tempo jump between stages, 84 to 128 BPM, or the arps doubling to 16ths when flow is high; ask which) | done (patch 18: assumed tempo jumps + arp doubling; one steady 88 BPM, intensity by layering only) |

| 09-28 13:49 | converting songs to MIDI means you can master and tweak the track, with no AI artifacts or noise | idea: a MIDI-driven stage soundtrack (Tront has Suno tracks to convert) |

Next music fix (from the 14:14 note): layers should latch. Once a layer is earned it holds for at least 8 bars and fades out over 2 to 4 bars instead of following flow straight down; the base layer returns only after a long quiet stretch. Keep the patch 15 exhale after x5, but make it a 2-bar breath that comes back to the latched layers, not to the pad.

## Next up (prioritized, as of 2026-09-28 after patch 20)

Pick from the top. Each one ships with receipts (clip.mjs before/after; co-op features also coop-res/swap-audit).

1. **Meta progression (Andre's Steam list, the last big open item).** A journey map of the stages you've reached, saved between sessions. Unlock the stage skins you've visited as a "start from" choice in zen (Jennifer keeps free play). A lifetime gem counter that fills a "treasury" you build up: the Homescapes idea, as a cabinet that gains ornaments.
2. **Click-to-swap discoverability (Andre's carpal tunnel note).** A first-run hint card ("tap a gem, then its neighbour"), a visible selection glow that pulses toward the valid neighbours, and a Settings option: swap on tap-tap only. Measure drag vs tap usage.
3. **Stage soundtracks from MIDI (Andre's idea, Tront's Suno tracks).** Convert a track to MIDI, store it as a compact note list in the HTML, and have ResonanceMusic play it through the same synth voices and layers (latched by flow). No samples, no AI noise, fully tweakable. Start with one stage as a test.
4. **More modes on top of endless:** Timed (2 minutes, Resonance counts double), Moves (30 moves, best score), Puzzle boards (clear in N moves). The run-end card already exists (patch 13) to reuse.
5. **Co-op team moments:** a "high five" burst when both players clear within a second; partner callouts ("PARTNER x5") in their colour; TEAM RESONANCE gets its own fanfare variant.
6. **Named payouts for chains, not just Resonance:** x7+ in one move gets a name card (like Dodecatris) and goes into a per-session highlight reel ("best chain", "biggest Resonance").
7. **Steam path prep:** a desktop wrapper (Tauri or Electron), Steam achievements mapped to milestones, stage unlocks, SUPERNOVA and co-op; controller glyphs; resolution and fullscreen options.

## Brainstorm (not committed, ideas to pick from)

- **Gem personalities:** each gem type gets a tiny idle life (hearts beat, diamonds glint, triangles spin) that speeds up with the music's beat.
- **Special gem showcase:** when a blast or prism is forged, a quick camera push-in plus a unique sound, grounded on the new gem (it's the thing, so the light lives on it).
- **Stage props:** each stage places a few 3D props in the world behind the cabinet (TIDEPOOL jellyfish, EMBER REEF coral glow, AURORA ribbons, STARFALL shooting stars that cross the sky on the beat).
- **Photo mode:** freeze the board, orbit the camera a little (Tront loves the perspective camera), and save a PNG with the stage name and score.
- **Daily board:** one seeded board a day, shared score; co-op friends see each other's result.
- **Spectator juice:** in the public room, watchers get the full show and can send cheers (a sparkle that flies to the board).
- **Accessibility:** colour-blind gem shapes are already distinct; add a high-contrast outline option and a larger cursor option.
- **Ghost of your best:** in Timed mode, a faint score line of your best run to race.
- **Music toys:** a Settings page that shows the live layers (pad, bass, arp, drums, lead) lighting up, so players see the music respond to them.
- **Jennifer mode check:** a calm preset (Flashes Low, Juice 80, music on, endless) one tap away, for winding down.

## Standing direction (Tront's calls, these override research)

- **MORE juice, never less.** Don't tone things down. When something reads weak, make it bigger. When something reads wrong, change its shape, not its volume.
- **The background flash on every match stays.** Tront loves it. The combo ladder escalates ABOVE it; it never takes x1's juice away. (Research suggests moving the sky flash off x1. Rejected.)
- **Endless/zen is the heart.** It is Jennifer's favourite mode. Progression, stages and fail states sit on top as options, never replacements.
- **No meme callouts in the game.** Milestones stay huge, but the text is plain (5K, 10K...). (André: the "it's over 9000" reference had to go.)
- **Co-op first.** Every feature has to work, and feel good, for everyone in the room, not just solo. Test the co-op path, not `#solo=1` only.
- **Art bible + direction doc next:** codify palette, particle language, the tier ladder, motion rules, audio rules and comfort rules in one place (ART-BIBLE.md), fed by the deep research handoff.

## 1. Combos that feel like COMBOS (top priority)

André: "Combos need to feel even more like combos, like really 'ooh yes I got a freaking 5x combo!'" (and the "remember this?" nightclub GIF). Brief: **a 5x combo turns the game into a concert.**

The escalation ladder (every tier keeps everything below it and adds a new KIND of response):

| Tier | Feeling | Adds |
|---|---|---|
| x1 acknowledge | "yep" | everything it has now (burst, sky flash, rim, streaks, embers, ring) |
| x2 reinforce | "nice" | a pitch step, a second voice, more streaks, the plaque appears |
| x3 momentum | the game anticipates | galaxy spins up, crown streams, a named callout, a riser under the next drop, persistent trails |
| x4 spectacle | the world joins | world rings, fireworks, horizon glow, hitstop + camera punch (patch 5), drums/bass layer in |
| x5 climax | FUCK YES | a unique sting, a screen treatment (colour invert or bloom blowout), a nightclub laser sweep, a named banner, a music payoff |
| x6+ encore | ridiculous | rainbow rings, crown fountain, lasers keep going, the lead keeps climbing |

- Named tiers (like Tetris Effect's named clears). Plain words, no memes.
- A sustained "aura" state while a chain is alive: frame glow, the board breathing to the beat.

## 2. The journey (stages, themes, music)

- **Stages and themes like Tetris Effect and Lumines.** Each stage has its own palette, sky, galaxy form, gem sound set, BPM and music. One data table: `{name, palette, skyTint, galaxyForm, bpm, meter, key, mode, stems, gemSoundSet}`.
- **Zen/endless progresses too:** every XX points (or cleared gems, since points inflate with skill), move to the next stage, crossfading on a downbeat without pausing the board. Each stage has 3 phases that add a layer and a visual beat. (André.)
- **Animated background that feels like a journey** while you play. (André.)
- **Pacing:** alternate calm stages (6/4, 100 to 120 BPM) with driving ones (4/4, about 135 BPM).
- **Meta progression:** unlocks that carry over between sessions, a journey map, maybe something you build up. aFoolsDuty compared it to Homescapes ("solve puzzles to rebuild the house or farm you inherited").
- **More modes than endless/zen** (timed, move-limited, puzzle boards).

## 3. Audio

- **Ambient music first, then a "banger soundtrack"** (André: stages + meta progression + online co-op + a banger soundtrack = "this would sell on Steam").
- **The player is the composer:** match, land and select sounds snap to the beat and climb the stage's scale (the core Tetris Effect trick). Snap only the result sounds, never the swap whoosh (latency).
- **Procedural stems, no samples:** pad, bass, hats, kick, arp and lead on one beat clock, in one key per stage, layered by flow and combo tier. Fixed 8-bar chord loops per stage so it never goes aimless. No licensing risk in a public one-file game.

## 4. Co-op

- **A shared "Resonance" meter, like Tetris Effect Connected's Zone:** both players' clears fill it. When it's full, a timed window where the music low-passes, each clear plays a chord and clears bank into one named payout. It must stay in sync across peers.
- **Co-op score comets** in each player's colour (shipped in patch 5; grow it: a "high five" burst when both players clear within a second).

## 5. Input and comfort

- **Gamepad support.** (André.)
- **Less drag fatigue:** a long session of hold-and-drag nearly gave a player carpal tunnel (low mouse sensitivity). Make click-click swapping obvious, and consider a shorter drag threshold. (André.)
- **Optional fail state:** "out of moves" ends the run, as a toggle. Default stays the reshuffle, for people who would rather the board just flip. (André, Tront.)
- **Photosensitivity option** (aFoolsDuty: a sweet combo "probably gave someone an epileptic fit"). This is an OPTION, not a default toning-down. The default stays at full juice. Add Flash Intensity (Full default, Low, Off) that caps flash luminance and rate (three flashes per second or fewer), and a toggle for the x5 screen treatment, the way Tetris Effect has MIN, MID and MAX. Needed for Steam anyway.

## 6. Platform

- **Steam** is the long-term target once stages, progression and music land.

## Done

- Patch 6: combo ladder (callouts SPARKLING..TRANSCENDENT, chord stings, x5+ sky lasers, speed lines, strobe).
- Patch 7: Resonance music (generative soundtrack that layers in with play).
- Patch 8: the journey (six score-driven stages: sky grade, tempo, progressions, stage show, progress bar).
- Patch 9: gamepad support + rumble + bold cursor.
- Patch 10: Flashes setting (Full/Low/Off).
- Patch 11: Resonance (a shared Zone-style meter, TEAM RESONANCE, a payout).
- Patch 12: result sounds snap to the beat.
- Patch 13: optional out-of-moves run end (solo).
- Patch 14: the board breathes to the beat + chain aura.
- Patch 15: research pass (x4 riser; the x5 duck, fanfare and slow-motion hold; the exhale; named payouts).
- Patch 16: phone strip for stage + Resonance; new link preview image (v2).

- Patch 5 (2026-09-28): Bejeweled-style invalid swap in solo AND co-op (the regression André and Tront hit); red brackets gone; hitstop + camera punch; squash and stretch; score comets; milestone meme removed.
