# Gems Together: art bible and direction

The rules every patch follows. Tront's calls override research. Living document: the deep Tetris Effect / Lumines research handoff will add to it; `research/TETRIS-EFFECT-DEEP-DIVE.md` is the short pass.

## North star

**A cozy co-op jewel board that turns into a concert when you play well.** Calm by default (it's Jennifer's zen mode), and huge when you earn it. Tetris Effect's synesthesia (what you do is what you hear and see) on a Bejeweled-feel board, shared with the people you love.

## The five laws

1. **MORE, never less.** If an effect reads weak, make it bigger. If it reads wrong, change its shape, colour or timing, never its volume. Comfort is an option in Settings, never a toned-down default.
2. **Juice has a hierarchy.** Every tier keeps everything below it and adds a new *kind* of response. Nothing is taken away from the base tier: the full background flash on every match stays.
3. **The board is sacred for reading, the world is for spectacle.** Gems stay legible. Big shows happen behind the cabinet (sky, galaxy, lasers, rings) and around it (speed lines, frame light). Callouts may cross the board briefly while it resolves, never while it waits for input.
4. **Co-op is the default path.** tront.xyz puts everyone in a shared room. Every feature has to look and sound right for the host and for the joining player, and has to be tested there (not only with `#solo=1`).
5. **Plain words.** Names are jewel and light words (SPARKLING, TIDEPOOL, PRISM HEART). No meme callouts, no dated references.

## The combo ladder

| Tier | Feeling | Visual (adds) | Audio (adds) | Camera and time |
|---|---|---|---|---|
| x1 | "yep" | gem burst, full sky flash + tint, rim flash, bloom, line streaks, embers, board ring, score comets | the drop's match tones in your key | none |
| x2 | "nice" | light chase around the frame, world ring, side plaque | pitch climbs | none |
| x3 | momentum | a centre callout (SPARKLING) that slams in, fireworks begin | chord sting | none |
| x4 | spectacle | a bigger callout (RADIANT) | the sting plus a sub boom, drums arrive in the music | hitstop 45 ms + camera punch |
| x5 | the concert | DAZZLING, sky lasers, anime speed lines, a 160 ms strobe in the tier colour | a lead melody over the music | longer hitstop, bigger punch |
| x6 to x9 | encore | BRILLIANT, PRISMATIC, LEGENDARY, rainbow TRANSCENDENT; nova, rainbow rings, crown fountain | the sting keeps climbing two semitones per step | punch keeps building |

Tier colours: x3 aqua `#8ff7ff`, x4 gold `#ffe27a`, x5 pink `#ff8ff0`, x6 lilac `#b9a4ff`, x7 mint `#7dffb0`, x8 amber `#ffb347`, x9+ rainbow (cycles the gem colours).

## Stages (the journey)

The stage comes from the shared score, so co-op partners always travel together. Stage lines sit at 5K, 15K, 30K, 50K, 75K and so on. The sky grade is a multiply (128 = unchanged) plus a horizon glow in the stage colour.

| # | Name | Sky grade (r, g, b of 128) | BPM | Mood |
|---|---|---|---|---|
| 1 | DAWN SHALLOWS | 128 128 128 | 84 | the drop's own dusk, calm |
| 2 | TIDEPOOL | 76 168 196 | 92 | cool teal, water |
| 3 | EMBER REEF | 210 112 78 | 104 | warm, glowing coral |
| 4 | AURORA DEEP | 150 88 214 | 116 | violet, northern lights |
| 5 | STARFALL | 70 96 204 | 96 | deep blue breather |
| 6 | PRISM HEART | 214 94 178 | 128 | magenta climax |
| 7+ | ENCORE | loops stages 2 to 6 | | |

Pacing alternates calm and driving tempos (Hydelic's numbers: about 100 to 120 BPM feels calm, about 135 BPM drives).

## Particle language

- **Small and bright reads as light; big and soft reads as snow.** Keep sparks small with hot cores.
- The drop's spark shape has a visible core about a fifth of the quad. Sizes of .05 to .2 are pinpricks; heads need about .9.
- Pale tints (diamond white) go icy cyan, or it looks like a snowstorm.
- Background depth is tied to radius, or the galaxy arms smear.
- Dust is warm-white and fans perpendicular to the motion. Rings are thin and fast.

## Motion

- **Bejeweled parity for swaps.** A valid swap slides on a smoothstep over .205 s. An invalid swap does the same slide, bumps (squash, rattle, dust) and slides back on the same curve.
- Swaps stretch along the travel axis. Landings squash with a damped wobble.
- Callouts slam in (starting at 2.5x scale and settling in about 0.15 s), then drift and fade. Cards slide in with an overshoot.
- Nothing teleports. `tools/swap-audit.mjs` flags any single-frame jump over 0.3 of a cell.

## Audio

- **Sample-free and generative.** Everything is WebAudio synthesis in one HTML file: no licensing risk.
- The music is in the player's Gem tones key (natural minor) and layers in with play: pad, then bass, arps, drums, and a lead during lasers.
- Stings climb with the tier. The swap whoosh is never delayed. Beat-snapping (next) applies only to result sounds.
- A player's own loaded track always wins over the soundtrack.

## Comfort (options, never defaults)

- Reduced motion: no camera punch, no strobe, the swirl freezes, flashes soften (already honoured).
- Next: a Flash Intensity setting (Full default, Low, Off) that caps flash brightness and rate at three per second or fewer, plus a toggle for the x5 strobe. It mirrors Tetris Effect's MIN, MID and MAX effect settings.

## Receipts standard

Every patch ships with before/after clips from `tools/clip.mjs` (manual clock, same deterministic board), collected in `tools/out/gauntlet/index.html`. Co-op-facing changes also run `tools/swap-audit.mjs` and `tools/coop-point.mjs`. Live verify runs after every push.
