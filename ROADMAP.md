# Roadmap

Every idea from the 2026-09-28 playtest thread on Discord, plus Tront's calls. Research backing: `research/TETRIS-EFFECT-DEEP-DIVE.md` (short pass; a deeper research handoff is coming from a separate run).

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

- Patch 5 (2026-09-28): Bejeweled-style invalid swap in solo AND co-op (the regression André and Tront hit); red brackets gone; hitstop + camera punch; squash and stretch; score comets; milestone meme removed.
