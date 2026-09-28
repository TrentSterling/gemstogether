# Changelog

## 3.2.4 hosting patch 8 (2026-09-28) The journey

Zen/endless now travels (Discord: "switch up the stage/background/theme/music after each XX points, like progressing a level"). Endless is still endless; the journey rides on top.

- **Six stages:** DAWN SHALLOWS, TIDEPOOL, EMBER REEF, AURORA DEEP, STARFALL and PRISM HEART, then ENCORE laps. The stage lines sit at 5K, 15K, 30K, 50K, 75K and so on, each stage a little longer than the last. The stage comes from the shared score, so co-op partners always travel together.
- **Every stage grades the whole sky** (with a glow along the horizon in its colour) and crossfades over a few seconds.
- **Every stage changes the music:** its own tempo, from 84 to 128 BPM, and its own chord progressions.
- **Crossing a stage line is a show:** a stage card slides in, lasers, world rings, fireworks and a light chase around the frame.
- **Under the score:** the stage number, its name and a progress bar to the next one.

## 3.2.4 hosting patch 7 (2026-09-28) Resonance music

The game now has a soundtrack that plays along with you (Discord: "next up is ambient music").

- **Generative and sample-free**, played on the music bus, so the Music volume slider controls it. It is in your Gem tones key (natural minor), at 84 BPM.
- **It layers in with your play**, Tetris Effect style. A soft pad is always there. Bass joins as the board warms up, then 16th-note arps through an echo, then kick, hats and clap when the board is hot or a chain hits x4. A lead melody plays while the x5 sky lasers are on, then it all settles back down.
- **Load your own track** in Settings and the soundtrack steps aside; remove it and it comes back. Mute works as before.
- Receipts: `tools/music-render.mjs` renders the real scheduler offline (a 60 s journey, plus audio muxed under the cascade clip) and checks the live path.

## 3.2.4 hosting patch 6 (2026-09-28) The combo ladder: x5 is a concert

From the Discord playtest: combos have to feel like "ooh yes I got a freaking 5x combo!". Before this, x3, x5 and x9 looked about the same. Now every tier keeps everything below it and adds a new kind of response:

- **x3 and up: a centre-stage callout** slams in over the board and gets bigger every step: SPARKLING, RADIANT, DAZZLING, BRILLIANT, PRISMATIC, LEGENDARY, and a rainbow TRANSCENDENT at x9.
- **x3 and up: a chord sting** (synthesized, no samples) that climbs two semitones per tier. x4 and up adds a sub boom.
- **x5 and up: nightclub lasers.** Twelve rainbow beams sweep up from the horizon behind the cabinet and keep going while the chain lives.
- **x5 and up: anime speed lines** burst around the board and taper outward, with a hard 160 ms strobe in the tier colour (skipped with reduced motion).
- Every match still gets the full background flash, exactly as before.
- Receipts: `tools/clip.mjs` (frame-stepped clips, before and after, same board) and `tools/gauntlet-report.py` write `tools/out/gauntlet/index.html`.

## 3.2.4 hosting patch 5 (2026-09-28) Bejeweled-style invalid swap + combo juice

- **An illegal swap now swaps and swaps back, like Bejeweled, everywhere.** The pair trades places at normal swap speed, bumps into the wrong cell (squash, a quick rattle, a puff of dust, the reject sound) and swaps back on the same curve. About half a second in all.
- **Why patch 4 didn't fix it:** tront.xyz puts everyone in the public co-op room, and in a room the drop turned an illegal move down before it ever moved: no motion, flat red corner brackets that didn't fit the gems, and a "No match" toast. Patch 4 only fixed solo play (the old half swap that snapped back). Now solo, host and joining players all get the same bounce, and a joining player's bounce starts instantly (checked against their own copy of the board, no network round trip). The bounce is presentation only: nothing is sent and the board stays in sync. The red brackets are gone, and "No match" no longer toasts.
- **Hitstop + camera punch:** cascades of x4 and up and every blast or prism freeze the frame for 45 to 80 ms and push the camera in, then spring back. Reduced motion turns the punch off.
- **Squash and stretch:** swaps stretch along the direction they travel (the drop squeezed every move sideways), and landings squash a little harder.
- **Score comets:** every cleared gem throws a comet that curves into the score, which punches and flashes a ring when they land. In solo they carry the gem colour; in co-op they carry the colour of whoever made the move, so you can see your partner's points arrive.
- **Milestones keep the show, lose the meme:** 5K, 10K, 25K, 50K, 100K, 250K, 500K, 1 MILLION, then every million. 10K gets the extra-big show.
- Receipts: `tools/swap-audit.mjs` (solo frame-stepped, plus a real two-browser private room with real mouse drags on host and peer) and `tools/swap-report.py` write `tools/out/swap/index.html`, comparing ChatGPT's drop, patch 4 and patch 5.
- New `ROADMAP.md` logs the playtest ideas from Discord; `research/TETRIS-EFFECT-DEEP-DIVE.md` has a short Tetris Effect / Lumines study.

## 3.2.4 hosting patch 4 (2026-09-27) Easing audit + score milestones

- **An invalid swap no longer teleports back.** The drop never updates a failed swap's home cells, so the gems were drawn at home for one frame between the slide and the return, and the return then eased home to home. Now they hold the swapped spot and bounce back off an invisible wall (back-out, about 11% overshoot, .34 s). Receipts: `tools/easing-audit.mjs` + `tools/easing-report.py` write a frame-stepped before/after report to `tools/out/easing/index.html`.
- **Combo plaque** slides in with overshoot, the number punches on each new step, and it fades out instead of vanishing. **Toasts** fade and rise in and out. **Score floats** pop in at 1.5x.
- **Score milestones:** 5K, 9K (replaced by 10K in patch 5), 25K, 50K, 100K, 250K, 500K, 1 MILLION, then every million. Each one throws the biggest show in the game: a big banner, six rainbow world rings, a ring of fireworks, a nova, a crown fountain and two light chases around the frame. The GPU font gained a "!" for the banners.
- **Light chase:** from cascade x2 on, comets race both ways around the gold frame and flash the corners.
- Falling gems leave light trails, the selected gem sheds curling motes, and embers are big enough to actually see.

## 3.2.4 hosting patch 3 (2026-09-27) Resonance FX

Tetris Effect style juice pass, from Andre's feedback on Discord ("up the particles/fx even more"). Presentation only: board state, scoring and co-op packets are untouched.

- **The world builds with your flow.** Every clear raises a flow meter that bleeds off when the board goes quiet. Behind the cabinet, a 7,000-mote spiral galaxy (one arm per gem colour) brightens and spins faster as flow climbs, and slows back to a whisper at rest.
- **Every clear hits the whole scene.** The sky picks up the colour of the gem you just cleared (pale diamonds go icy cyan), a tinted wave rolls out behind the board, the horizon glows, the screen rim flashes in that colour, and bloom swells with the hit.
- **Line sweeps:** light streaks rip along the axis of each matched line, both ways, then embers curl upward and linger.
- **Shockwaves:** a tight ring on the board for every clear, a huge thin ring out in the world from cascade x2 on.
- **Cascade x3+ fires fireworks** around the cabinet, more with every step. Blasts and prisms (and any x5+ step) throw a spiralling nova. Finishing an x3+ chain sprays a fountain out of the crown; x6+ adds six rainbow world rings.
- While the board is hot, thin streams of light pour out of the galaxy into the crown.
- Swaps leave a quick spark trail, long drops kick up a little dust, and gem bursts carry more sparks and shards (spark pool 24k to 60k).
- Respects the existing settings: Particles off turns the whole layer off, Juice scales it, reduced motion freezes the swirl and softens the flashes, and Light quality halves the galaxy.
- Held 60 fps through a full Showcase chain (about 15k live sparks) on WebGPU; WebGL2 path checked too.
- Code: `tools/resonance.js` (class + shader snippets), wired in by `tools/polish.py`. Look-check tools: `tools/fx-shot.mjs` (Showcase frames + flow state), `tools/fx-iso.mjs` (one layer at a time). Hook: `window.__jewel.fx()`.

## 3.2.4 hosting patch 2 (2026-09-26) Point ping

- **Right-click a gem to point at it.** Your co-op partners see a pulsing reticle with a bobbing chevron on that gem, in your player colour, for about 2.5 seconds (plus a soft glass ping if their sound is on). Nothing gets selected, grabbed or swapped on either side, and the board stays in sync. You see your own marker too. Right-click again to re-ping, or on another gem to move it. Mouse only for now.
- The two extra floats ride on the cursor packet only while a point is live; otherwise the packet is the original 44 bytes, so a partner on the previous build keeps every cursor cue.
- `tools/verify.mjs` 22 checks; new `tools/coop-point.mjs` (two real browsers in a private room, 10 checks).

## 3.2.4 hosting patch 1 (2026-09-26)

- **Right click no longer opens Chrome's "Save image as" menu** over the board or the GPU buttons (long-press callout on iOS too). The co-op code box and About links keep their normal menus.
- Browser shortcuts no longer fire game hotkeys: Ctrl/Cmd/Alt + key is left to the browser (Ctrl+F used to go fullscreen, Ctrl+D started Showcase, Alt+Left was swallowed).
- Trackpad pinch and Ctrl+wheel over the board no longer zoom the page.
- Internal save keys and the co-op network name are gemstogether now (saves from launch day reset).
- `tools/verify.mjs`: 19 checks, including a real right-click on a gem and on a GPU button.

## 3.2.4 (2026-09-26) First hosted version

Live at https://tront.xyz/gemstogether/. ChatGPT's 3.2.4 drop, plus hosting polish via `tools/polish.py`:

- Canonical, author, Open Graph and Twitter meta; OG image (Showcase cascade, full-bleed band).
- "No moves, reshuffling" toast without the em dash.
- tront.xyz About block with JSON-LD (`seo/about.py gemstogether`).
