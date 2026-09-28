# Tetris Effect / Lumines: what Gems Together should steal

Short pass (2026-09-28). Scope was cut to a one-pager because a separate, deeper research run is happening. Claims come with URLs. Anything not fetched this session is marked (unverified).

## What the sources say (the load-bearing facts)

- **The player is the composer.** Moving or rotating a piece adds a pitched vocal chop inside one mode (Bb Phrygian in the opening stage). Placing a piece fires a percussive stinger. A line clear fires a longer stinger (a long note plus a short four-note synth figure), and the notes change each time. [Game Developer audio analysis](https://www.gamedeveloper.com/audio/game-audio-analysis---tetris-effect)
- **Those inputs are quantised to the beat.** Every rotate is a harmonised note "quantised to the beat (making it sound like you're playing in time to the music, even if your input is slightly off)", and drop chords grow "in scope and depth depending on how many lines you've just cleared". [Nicholas Singer](https://www.nicholassinger.com/blog/tetriseffect)
- **Layers come in on time and on progress.** Layers are added at about 30 s and 50 s. Drums and a vocal line come in at 12 lines, and at 24 lines the song moves to its chorus and the move sound changes instrument. The song keeps a fixed intro, verse, chorus and outro, but how long each part lasts depends on how you play. [Game Developer](https://www.gamedeveloper.com/audio/game-audio-analysis---tetris-effect)
- **Stage phases switch the visuals and the tempo together.** "Within a single stage, there are several timings where the visuals switch depending on the number of lines you cleared, and we change the music's tempo in time with this." Tempos that worked: 4/4 at about 135 BPM for excitement, and 6/4 at 100 to 120 BPM for calm. Visuals were recoloured to fit the music, not the other way round. [Hydelic on Splice](https://splice.com/blog/hydelic-q-and-a/)
- **Journey structure:** 27 stages in 7 areas. Each stage is 30, 36 or 48 lines depending on difficulty, and it changes phase every 10, 12 or 16 lines, so a stage has 3 phases with rising speed. Every stage has its own block skin, background and sound. [TetrisWiki](https://tetris.wiki/Tetris_Effect)
- **Zone:** the meter fills a quarter at a time as you clear lines. Using it stops gravity for up to 20 s, and cleared lines pile up at the bottom so they pay out together. Payouts get names by size (Octoris, Dodecatris, Decahexatris, Perfectris, Ultimatris). "Zone Brilliance" (the screen inverts at 8+ lines) can be set to MIN, MID or MAX. In Zone the music gets a low-pass filter, the vocals drop out, and each clear plays a chord. [TetrisWiki](https://tetris.wiki/Tetris_Effect), [Game Developer](https://www.gamedeveloper.com/audio/game-audio-analysis---tetris-effect)
- **Relax modes:** in Chill Marathon, topping out resets the board and score. You never get a game over. [TetrisWiki](https://tetris.wiki/Tetris_Effect)
- **Connected co-op:** 3 players fill one shared Zone meter. When it is full, their boards merge into one big field and they take turns dropping pieces. A downed player revives by tapping in rhythm, and teammates speed that up with big clears. [TetrisWiki](https://tetris.wiki/Tetris_Effect), [official site](https://www.tetriseffect.game/2020/10/28/classic-tetris-mode-joins-all-new-co-op-and-competitive-multiplayer-modes/)
- **Comfort settings:** Line Clear Effects (MIN, MID, MAX), Zone Brilliance (MIN, MID, MAX), Mino Strobe (pieces pulsing to the music) ON or OFF, and Matrix Visibility. [search summary of the GameFAQs settings guide; the page returned 403, so only half-verified](https://gamefaqs.gamespot.com/pc/296457-tetris-effect-connected/faqs/78800/settings). Reviewers say it plays well on mute, and that the busy backgrounds can distract. [Can I Play That](https://caniplaythat.com/2020/12/02/tetris-effect-connected-accessibility-review/)
- **How it was made:** the music came first, then "we cut the sound and then sync them to each action", and in playtests they asked "what did you feel?" [Mizuguchi, Wccftech](https://wccftech.com/interview-tetsuya-mizuguchi-synesthesia-tetris-effect-rez-lumines/). The working title was "Zen Tetris" for a long time. [Enhance on X](https://x.com/enhance_exp/status/1438637408006729728). GDC 2019 talk: [Making 'Tetris Effect'-ive](https://www.gdcvault.com/play/1026528/Making-Tetris-Effect) (video not transcribed here).
- **Lumines Arise:** its Journey has 35+ stages called "skins" [Wikipedia](https://en.wikipedia.org/wiki/Lumines_Arise). Block moves make woody tones and landings make percussive thwacks, and the sounds swap per skin (strings on drop, cutlery on rotate in the food skin). During a Burst "the track fades to the background, though the drums continue to rise", which works like an 8-bar breakdown that the player times. [Bandcamp Daily](https://daily.bandcamp.com/features/hydelic-takako-ishida-lumines-arise-interview). (Unverified: in classic Lumines, the timeline sweeps at the skin's BPM, and the skin swaps mid-play without stopping the board.)

## The combo ladder (spend juice by tier, not all at x1)

Today, x1 already gets the sky tint, rim flash, bloom, streaks, embers and a ring. That spends most of the budget on the most common event. Re-tier it so each step adds one new kind of response:

| Tier | Feeling | Visual | Audio |
|---|---|---|---|
| x1 acknowledge | "yep" | gem burst, one board ring, small sparks. No sky or rim flash. | one quantised glass note on the stage scale |
| x2 reinforce | "nice" | line streaks, soft sky tint, flow +1 | note steps up the scale, a quiet second voice |
| x3 momentum | the game anticipates | galaxy spins up, crown streams start, the combo plaque shows "x3" and a named callout | a riser starts under the next drop, hats come in |
| x4 spectacle | the world joins in | world ring, fireworks, horizon glow, hitstop and camera punch (already there) | drums and bass layer in, chord replaces single notes |
| x5 mini climax | "I got a freaking 5x" | a unique x5 sting: a brief screen treatment (colour invert or desaturate-then-bloom, capped by the comfort setting), nova, a big named banner | music payoff: low-pass sweep that opens on the beat, a vocal-style chop or lead phrase, a downbeat hit |
| x6+ | encore | rainbow rings, crown fountain (already there) | the lead melody keeps climbing; the payoff repeats with variation |

## What to steal, prioritised

1. **Re-tier the existing FX along the ladder above** (S). Most pieces already exist in `tools/resonance.js`. The work is gating them by cascade step and moving the sky and rim flash off x1. Why: the playtesters' ask about combos, and it mirrors Tetris Effect's clear-size escalation. Risk: x1 may feel flat. Keep the gem burst generous.
2. **Beat clock plus quantised match sounds** (S to M). Run one WebAudio clock at the stage BPM. Snap match, land and select notes to the next 1/8 or 1/16 (with a max delay of about 60 ms so input still feels immediate). `JewelAudio.match` already climbs a scale by cascade, so reuse it. Why: this is the core Tetris Effect trick. Risk: the latency feel on swaps. Quantise the resolution sounds, never the swap whoosh.
3. **Procedural stem music, no samples** (M). Build 4 to 6 synth layers (pad, bass, hats, kick, arp, lead) scheduled on the beat clock in one key per stage. Flow level and combo tier bring layers in, as with the Tetris Effect layers at 12 and 24 lines. Keep the "load your own track" option. Why: no licensing risk, fits one HTML file, and gives the ambient-first, banger-later path. Risk: generative music can sound aimless. Write fixed 8-bar chord loops per stage rather than random notes.
4. **Stage theme data format** (S). One object per stage: `{name, palette, skyTint, galaxyForm, bpm, meter (4 or 6), key, mode, stems, gemSoundSet}`. Why: the Tetris Effect and Lumines skin concept, one table to author. Risk: none; it is data.
5. **Zen journey: next stage every N points** (M). Each stage has 3 phases (as in Tetris Effect), and each phase adds a layer and a visual beat. At the stage boundary, crossfade palette, galaxy form and music over 2 to 4 bars, on a downbeat, without pausing the board. Endless stays endless. The journey sits on top of it. Why: the #1 playtester ask, and it maps to Journey stages and phases. Risk: points inflate with skill. Consider scaling N per stage, or counting cleared gems instead of points.
6. **Calm and intense pacing across stages** (S, once 4 and 5 exist). Alternate 6/4 around 100 to 120 BPM calm stages with 4/4 around 135 BPM driving ones (Hydelic's numbers). Why: Jennifer's zen mode needs to breathe. Risk: none.
7. **Co-op "Resonance" meter, Zone-like** (M to L). Both players' clears fill one shared meter. When it is full, fire a timed window (8 to 12 s) where the music low-passes and each clear plays a chord (Tetris Effect's Zone audio), and clears bank into one named payout at the end. Why: this is what Connected does for co-op, a shared goal with a shared climax. Risk: it must stay deterministic across peers. Sync the window start with a packet and keep it presentation plus a score multiplier only.
8. **Photosensitivity settings** (S). Add Flash Intensity (Off, Low, Full) that caps sky and rim luminance change and limits full-screen flashes to 3 per second or fewer (the WCAG three-flashes guideline), plus a Screen Treatment toggle for the x5 invert. Mirror Tetris Effect's Line Clear Effects and Zone Brilliance MIN, MID, MAX. Why: the playtester flash complaint, and it is needed for Steam. Risk: none. Ship it before adding any bigger flashes.
9. **Named payouts** (S). Name the cascade tiers, and name the Resonance payout by size the way Zone does (Octoris and so on). Why: players remember a name. Risk: tone. Avoid meme text (patch 5 already dropped the meme).
10. **Meta progression** (M, speculative). Unlock stages in order and show a journey map. Add an XP level that unlocks one hidden stage (Tetris Effect gives the 1989 stage at level 50). Why: the "carries over" ask. Risk: gating Jennifer's favourite stage. Keep endless free-select for unlocked stages.

Not stolen: VR, bosses and blitzes (a bigger design than the ask), and fixed licensed tracks (licensing risk in a public one-HTML game).

## Best links

1. https://www.gamedeveloper.com/audio/game-audio-analysis---tetris-effect
2. https://splice.com/blog/hydelic-q-and-a/
3. https://tetris.wiki/Tetris_Effect
4. https://www.nicholassinger.com/blog/tetriseffect
5. https://daily.bandcamp.com/features/hydelic-takako-ishida-lumines-arise-interview
6. https://www.gdcvault.com/play/1026528/Making-Tetris-Effect
7. https://wccftech.com/interview-tetsuya-mizuguchi-synesthesia-tetris-effect-rez-lumines/
8. https://caniplaythat.com/2020/12/02/tetris-effect-connected-accessibility-review/
9. https://en.wikipedia.org/wiki/Lumines_Arise
10. https://blog.playstation.com/2018/06/25/tetris-effect-adds-a-new-strategic-layer-to-the-decades-old-game-and-it-works/
