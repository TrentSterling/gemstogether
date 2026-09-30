# Roadmap

Every idea from the 2026-09-28 playtest thread on Discord, plus Tront's calls. Research backing: `research/TETRIS-EFFECT-DEEP-DIVE.md` (short pass; a deeper research handoff is coming from a separate run).

## 0. Andre's feedback (the north star)

Tront: "log andres feedback its basically our north star to impress him". Andre plays it, spots real bugs and has the taste call. Every item he raises goes here first.

| When | Andre said | Status |
|---|---|---|
| 09-28 02:36 | the "it's over 9000" reference has to go | done (patch 5) |
| 09-28 02:36 | next: ambient music, and a background that animates like a journey | done (patches 7, 8, 14) |
| 09-28 02:39 | add gamepad support | done (patch 9) |
| 09-28 02:40 | hold-and-drag nearly gave him carpal tunnel | done (patch 21: tap hint, neighbour glow, tap-only option and gesture counts) |
| 09-28 02:43 | stages and themes like Tetris Effect + meta progression + online co-op + a banger soundtrack = sells on Steam | progression added in patch 21; desktop and achievement preparation ready |
| 09-28 02:43 | zen/endless should switch stage, background, theme and music every XX points | done (patch 8) |
| 09-28 02:45 | some kind of fail state, "out of moves" | done as an option (patch 13) |
| 09-28 02:46 | combos need to feel like "ooh yes I got a freaking 5x combo!" | done (patches 6, 15) |
| 09-28 02:46 | do a deep dive on Tetris Effect or Lumines Arise | done (research/) |
| 09-28 14:11 | Animation speed isn't saved in settings | fixed (patch 17) |
| 09-28 14:14 | "cool dynamic music... the increase in intensity and layering is cool, **it should probably not drop back to base layer so quickly once a higher layer is reached**" | done (patch 18: layers latch and step down) |
| 09-28 14:14 | "I'm not sure about the speed up" (the tempo jump between stages, 84 to 128 BPM, or the arps doubling to 16ths when flow is high; ask which) | done (patch 18: assumed tempo jumps + arp doubling; one steady 88 BPM, intensity by layering only) |

| 09-28 13:49 | converting songs to MIDI means you can master and tweak the track, with no AI artifacts or noise | cancelled by Trent on 09-29 |

The music latch and two-bar breath shipped in patch 18. Intensity comes from layers at a steady 88 BPM.

## Delivered in 3.3.0 (patch 21, 2026-09-29)

Trent authorized every priority except MIDI, plus the brainstorm below. Source: `tools/expedition.js`, injected by `tools/polish.py`. Receipts include deterministic before/after clips, private co-op and an isolated public room with a real spectator.

1. **Meta progression:** saved journey, visited stage skins as endless starting choices, lifetime gem treasury and six cabinet ornaments. Skins preserve a fresh score of zero.
2. **Tap-to-swap discoverability:** first-run hint, neighbour pulses, tap-only comfort choice, saved tap/drag/keyboard/pad gesture counts.
3. **More modes:** two-minute Timed with double Resonance scoring, 30 Moves, four deterministic puzzles and Daily. Budgets are authoritative and end after the current cascade; invalid swaps and cascade waves cost no extra moves.
4. **Co-op team moments:** high-five burst, partner x5+ callouts in their colour and a distinct team fanfare. Contributions and challenge state mirror to joining players and survive host handoff.
5. **Named chain payouts:** x7 CROWN OF LIGHT, x8 PRISM PARADE, x9+ CONSTELLATION. Session moments retain the five strongest chains and three biggest Resonances independently.
6. **Steam preparation:** portable Electron Windows wrapper, 22 allowlisted milestone achievements, Xbox/PlayStation glyphs, controller menu navigation, resolution and fullscreen. Steam dashboard registration and live achievement activation still require the registered App ID/account.

## Brainstorm delivered in patch 21

- **Gem personalities:** hearts pulse, facets glint and triangles tilt to the beat, respecting motion and idle settings.
- **Special gem showcase:** grounded forge reveal and sound, with a short camera push.
- **Stage props:** crystals, jellyfish, glowing coral, aurora ribbons, stars and prism sculptures. Starfall also sends shooting stars on downbeats.
- **Photo mode:** local frozen view, small orbit and stamped PNG; the shared board continues to sync.
- **Daily board:** a UTC-day seed with 30 moves and connected friends' saved daily results.
- **Spectator juice:** the full cascade show and cosmetic cheers, with no board mutations or progression farming.
- **Accessibility:** high contrast outlines and larger cursor.
- **Ghost of your best:** saved Timed score trajectory and a faint score marker.
- **Music toys:** live pad, bass, arpeggio, drums and lead meters from the real scheduler.
- **Jennifer mode:** one-tap calm preset; personal comfort stays local in shared play.

## Current follow-through

- **Announcer:** added in patch 22 / 3.3.1. Trent selected Qwen's Warm founder and Cave-inspired clean, both lowered. Nineteen lines at three pitches per voice include “Welcome back to Gems Together!” Local voice/pitch/volume controls, previews, occasional celebrations and music ducking work in the single HTML and Windows app. Real browser gate 136/136, compressed speech-content check 114/114. OmniVoice's audition remains local.
- **Transitions:** sky, background light and 3D stage props blend over 3.2 seconds without pausing play. Patch 23 / 3.3.2 aligns scenery and chord changes on the soundtrack's next downbeat. Three phases add bass, arpeggios, scenery and beat response at a steady 88 BPM. Real audio-clock checks passed 30/30 across both GPU backends and private co-op, including a swap before travel and different local audio settings.
- **Stage harmony and comfort:** patch 24 / 3.3.3 completes six unique progression pairs and stage keys, matching gem tones and stings, Resonance music filtering, beat-aligned landing sounds and an independent big-combo screen flash switch. Low shares a 350 ms interval across large flash events. Actual audio/GPU/private co-op gate: 121/121; matched music samples are at `tools/out/harmony/index.html`.
- **Release verification:** final 3.3.3 native checks pass for the packaged executable and extracted ZIP, with matching browser/package/extracted HTML hashes. The guarded test launcher refuses restricted tokens before starting Electron. Publication still awaits explicit approval; Steam account setup and live achievement validation remain external.
- **Steam account work:** create an App ID, register the 22 exact achievement API names, then verify activation and delivery with the real Steam client. Local wrapper smoke checks cover the GPU game, preload isolation, ID validation, resolution and fullscreen.

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

- **Stages and themes like Tetris Effect and Lumines.** Each stage has its own palette, sky, galaxy form, props and chord progression. The tempo stays at 88 BPM.
- **Zen/endless progresses too:** every XX points (or cleared gems, since points inflate with skill), move to the next stage, crossfading on a downbeat without pausing the board. Each stage has 3 phases that add a layer and a visual beat. (André.)
- **Animated background that feels like a journey** while you play. (André.)
- **Pacing:** calm and driving passages come from layers and scenery at one steady tempo (Trent's patch 18 direction).
- **Meta progression:** unlocks that carry over between sessions, a journey map, maybe something you build up. aFoolsDuty compared it to Homescapes ("solve puzzles to rebuild the house or farm you inherited").
- **More modes than endless/zen** (timed, move-limited, puzzle boards).

## 3. Audio

- **Ambient music first, then a "banger soundtrack"** (André: stages + meta progression + online co-op + a banger soundtrack = "this would sell on Steam").
- **The player is the composer:** match, land and select sounds snap to the beat and climb the stage's scale (the core Tetris Effect trick). Snap only the result sounds, never the swap whoosh (latency).
- **Procedural stems:** pad, bass, hats, kick, arp and lead on one beat clock, in one key per stage, layered by flow and combo tier. Fixed 8-bar chord loops per stage. Announcer auditions are separate from the soundtrack.

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

- Patch 24 (3.3.3): six distinct stage harmonies, musical gem and celebration tones, music-bus filtering during Resonance and the saved big-combo screen flash option. New-board audio resets and queued tones across a key change are verified; Full remains the default.
- Patch 23 (3.3.2): stage travel and chord changes enter on a downbeat, three within-stage phases add musical layers and scenery, and the stage progress indicator shows thirds. Shared scoring and Resonance capacity advance immediately; the presentation uses each player's audio clock.
- Patch 22 (3.3.1): embedded Qwen announcer, two selected synthetic identities at three lower pitches, returning-player greeting, stage/chain/team/payout cues, local controls and music ducking. Practice, Showcase and calm stay quiet.
- Patch 21 (3.3.0): saved journey and treasury, input onboarding, shared modes, team moments, highlights, living gems, stage props and crossfades, photos, daily friends, spectator cheers, accessibility, ghost, music meters, calm preset, desktop/Steam preparation and local voice audition tools. MIDI cancelled.
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
