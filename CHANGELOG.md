# Changelog

## 3.3.6 hosting patch 28 (2026-10-01) Play access and phone guidance

- Play opens challenges and puzzles directly from the board; Journey retains progression and stage choices. The seven board controls fit one desktop row or two phone rows.
- All panel footers follow the latest input. Touch names Back or Audio and explains swiping; keyboard keeps Esc and scrolling; controller names B or Circle and explains trigger scrolling.
- On screens 640 pixels tall or shorter, the About link moves to the top corner so it cannot cover game controls. Compact portrait and landscape overlap checks cover both renderers.
- Short landscape layouts place score, stage, Resonance and challenge information above the button rail, with a compact first-run hint and side notices. Timed best-run ghosts retain their score comparison.
- Phone verification now uses mobile emulation at 2x density, browser touch taps and swipes, challenge selection and portrait/landscape rotation on WebGPU and WebGL. Physical phone and USB-controller playtests remain manual.
- README, roadmap and art direction now describe the selected Silver crystal voice and current browser release.
- Validation: gameplay 22/22; UI/touch 112/112 across both renderers; progression/private co-op 48/48; spectator/host migration 15/15; stage transitions 16/16; audio-clock journey 30/30; stage harmonies 121/121; aligned highlights 21/21; audio/settings/private co-op 163/163; selected-asset release audit 30/30. Firefox 157 / WebGL 2 renders cleanly and verifies stereo voice playback and immediate voice disable.

## 3.3.5 hosting patch 27 (2026-09-30) Silver crystal

- Silver crystal is the selected default: exact Original 07 / Tuned stereo crystal from the voice auditions. All nineteen performances retain the approved compressed bytes, with low pitch correction, darker vowels, short stereo layers and a small bloom.
- Audio settings name the selected voice and its tuned stereo treatment. The saved Announcer voice off switch and independent volume remain available; upgrading preserves both preferences.
- Selected MP3s are frozen in the repository. Default pack rebuilds install those takes without synthesis or re-encoding; the earlier six voice options retain their exact assets.
- Compressed speech: 133/133. Real audio, settings, stereo and private co-op: 163/163. Browser release gate: 22/22. Firefox verifies stereo playback and immediate voice disable.

## 3.3.4 hosting patch 26 (2026-09-30) Silver master

- Silver / arcade lift is the default announcer selected by Trent. Nineteen lines use the retained synthetic speaker, with a smooth greeting and expressive celebrations. The three approved audition performances are preserved; the new Silver clips have no final pitch, EQ, reverb or doubling effects.
- The main Audio tab has a saved Announcer voice on/off switch. Turning it off immediately cancels active and queued speech while keeping music and gem sounds. Voice volume, previews and the earlier Warm founder/Cave choices remain available.
- The new pack chooses Silver on its first load while preserving existing voice-off and volume preferences. Subsequent voice choices persist normally.
- Exact compressed speech checks: 133/133. Real WebAudio, GPU controls, phone and private co-op: 161/161. Original browser gate: 22/22. This is a browser release for tront.xyz; no native package is part of the release.

## 3.3.3 local playtest patch 25 (2026-09-29) Aligned highlights

- Move preview follows each rendered gem's silhouette, rotation, lift and scale, including the heart notch. High contrast and puzzle targets share the same contour; each gem draws one outline.
- Mouse, keyboard and controller focus use one depth-tested bracket fitted to the physical socket. Brightness pulses without enlarging or lifting the bracket away from its tile.
- The frame beat lights the cabinet's existing cyan inlay with scene depth occlusion. Removed the three oversized HUD bands that floated outside the board.
- Geometry and GPU checks: 21/21 across desktop WebGPU, phone WebGPU and desktop WebGL. Firefox 157 / WebGL 2 also renders cleanly; existing gameplay gate: 22/22; private host/peer point gate: 10/10. Screenshots and receipts: `tools/out/highlights/`.
- This remains an unpublished browser project for tront.xyz. Trent is playtesting before deciding on a push. Deeper Qwen announcer auditions require discussion before generation.

## 3.3.3 hosting patch 24 (2026-09-29) Six worlds, six harmonies

- All six worlds have distinct eight-bar progression pairs and keys relative to Gem tones. At the default setting the journey moves through D, G, E, A, F and C minor. Stage harmony starts on its travel downbeat; old pads fade and a new board promptly starts its own opening harmony.
- Glass tones, special-gem tones, chord stings and fanfares follow the audible stage scale. A result queued across a stage boundary uses the upcoming key. Landing sounds now snap to the grid; swap whooshes, interface ticks and rejects keep their timing.
- All eight selectable Gem tones keys retain pitch in all six worlds, including the highest chain notes. The team phrase moves down a whole octave when needed to keep its upper notes in range. Loading a local track fades the old synth tails; clearing it restarts the generative soundtrack.
- Resonance low-passes the actual music bus, including loaded local tracks. Banked clears gently brighten the filter; payout opens it again. Speech keeps its own route and continues ducking the filtered music.
- Journey > Comfort adds a saved Big combo screen flash switch, enabled by default. Flashes Low shares a 350 ms interval across large flash events; Full retains every effect. Turning off the combo screen flash preserves speed lines, banners, lasers and audio.
- Real audio/GPU/private co-op gate: 121/121. Separate stage-clock gate: 30/30; announcer: 136/136. Before/after eight-bar audio samples and matched Low-flash cascade clips are in the gauntlet.
- The final Windows package and extracted ZIP both pass native smoke checks on the exact browser-tested HTML: WebGPU, 64 gems, isolated preload, achievement allowlist, resolution/fullscreen, all six welcome-back variants, stage harmonies and Resonance filtering.
- The Windows test launcher now refuses restricted security tokens before starting Electron, suppresses crash dialogs for its own child processes, enforces a timeout and rejects stale receipts. This replaces the restricted test path that triggered a Windows breakpoint dialog; the game's sandbox stays enabled.

## 3.3.2 hosting patch 23 (2026-09-29) Travel on the beat

- Scenery and chord changes enter together on the next soundtrack downbeat, then the background and props crossfade over 3.2 seconds. Swaps and score continue immediately.
- Each stage has three phases: the opening scenery, then bass and more props, then arpeggios and another pair of props. Beat response grows with the scenery; tempo stays at 88 BPM. Progress bars show thirds.
- Travel uses each player's local audio clock. Shared Resonance capacity still follows score immediately. Muted music and loaded tracks use an immediate fade; starting a new board cancels a queued entrance.
- Thirty real audio-clock, phase and private co-op checks passed on WebGPU and WebGL, alongside the existing sixteen transition checks. The announcer still passes all 136 playback checks.

## 3.3.1 hosting patch 22 (2026-09-29) Welcome back

- “Welcome back to Gems Together!” greets returning players once after their first sound interaction. First visits have their own welcome.
- Embedded Qwen announcer pack: the selected Warm founder and Cave-inspired clean voices, each lowered by 2, 4 or 6 semitones without slowing the delivery. Warm founder / -4 is the default.
- Audio > Announcer voices offers local voice, pitch and volume controls, an on/off toggle and previews. New stages, completed big chains, Resonance, payouts and challenge completions get occasional celebrations.
- One speaker at a time, a minimum interval and repeat guard keep speech sparse. Music ducks and restores, including a loaded track. Master mute cancels speech; practice, Showcase, photos and Jennifer's calm preset stay quiet. Co-op players keep their own voice choices.
- All 114 compressed clips are bundled in the single HTML and portable Windows build; playback needs no TTS service. Browser gate 136/136 and independent speech-content check 114/114 passed.

## 3.3.0 hosting patch 21 (2026-09-29) Your journey, together

- Journey saves visited stages, unlocked endless starting skins, lifetime gems, six cabinet ornaments and 22 local achievements. Practice and spectators do not earn progression.
- Tap-to-swap onboarding, neighbour pulses, tap-only input, gesture counts, high contrast outlines, a larger cursor and Jennifer's calm preset. Comfort choices stay local in co-op.
- Shared two-minute Timed, 30-move, four puzzle and seeded daily challenges. Timed Resonance scores double; a best-run ghost and connected friends' daily results provide something to race.
- High fives, partner chain callouts, a team fanfare, named x7+ chain payouts and a session list retaining the best chains and biggest Resonances. Spectators can send cosmetic cheers.
- Living gem personalities, grounded special-forge reveals and stage props. Fields of light crossfade over 3.2 seconds as new props settle into place. Starfall sends shooting stars across the background on the beat.
- Photo mode freezes your view, supports a small camera orbit and exports a PNG stamped with stage and score. Shared play and network updates continue behind the frozen view.
- Music settings show the live five-layer soundtrack. The tempo stays at 88 BPM.
- Portable Electron Windows build, isolated Steam achievement bridge, Xbox/PlayStation menu glyphs, resolution controls and fullscreen. Live Steam activation needs the registered App ID and dashboard entries.
- Local announcer audition tools compare warm, playful Qwen3 and Kokoro voices on identical game lines; VoiceStudio is cloned separately for its OmniVoice audition. Auditions stay outside the game package pending the voice selection.
- MIDI soundtrack work was dropped at Trent's request.

## 3.2.4 hosting patch 20 (2026-09-28) Every stage gets its own sky

- **Backgrounds swap with the stage.** Behind the cabinet, the field of light rebuilds into a new shape at every stage line: TIDEPOOL ripples, EMBER REEF embers, AURORA DEEP curtains, STARFALL stars, PRISM HEART's twelve-arm rainbow.

## 3.2.4 hosting patch 19 (2026-09-28) Lights sit where they belong

- The light that races around the frame, and the flashes on its corners, now ride the real gold rails and land exactly on the corner orbs at every window size (they were slightly off on desktop and well off on phones). The beat glow follows the rails through the camera's perspective, and the gamepad cursor sits on the gems instead of floating in front.

## 3.2.4 hosting patch 18 (2026-09-28) The music holds what you earn

From Andre on Discord: "the increase in intensity and layering is cool, it should probably not drop back to base layer so quickly" and "not sure about the speed up".

- **Earned layers stick.** Once the bass, arps, drums or lead come in, they hold for a few bars and then step down one at a time (drums, then arps, then bass) instead of collapsing to the pad the moment the board goes quiet. After a big chain the music takes a 2-bar breath and comes back to where you were.
- **No more speed-ups.** The soundtrack stays at one steady 88 BPM. Stages change the chords, not the tempo, and a hot board adds a shimmering octave voice instead of doubling the notes.

## 3.2.4 hosting patch 17 (2026-09-28) Animation speed is saved

- **Settings > Lab > Animation speed now sticks** between visits, like every other setting (reported by Andre on Discord). In co-op the board still follows the host's speed.

## 3.2.4 hosting patch 16 (2026-09-28) Phones get the journey

- New link preview image: a x5 DAZZLING over a stage change, with lasers and the Resonance glow.

- On phones, a strip under the Co-op Room button now shows your stage and its progress bar, plus the Resonance meter (your share and your partner's in co-op, rainbow while it runs).

## 3.2.4 hosting patch 15 (2026-09-28) x5 crosses a line

From the deep research on Tetris Effect and Lumines ("make 5x cross a state boundary that 1x cannot access"):

- **x4 warns you:** a riser climbs toward the next step.
- **Your first x5 is the climax:** the music drops out for a heartbeat, then slams back with a fanfare phrase you only hear here, a crash and a sub hit. Time slows to 0.3x for almost half a second while gold shock rings roll out.
- **Then it breathes:** after a big chain the soundtrack falls back to the pad for two bars before building again.
- **Resonance payouts have names now:** RADIANT RESONANCE, PRISMATIC RESONANCE and SUPERNOVA.

## 3.2.4 hosting patch 14 (2026-09-28) The board breathes to the beat

- The frame glows in the stage colour on every beat (harder on downbeats and as your flow rises) and the gems bump with it. A chain of x3 or more holds a glowing aura in the tier colour, rainbow during Resonance. Reduced motion turns the bump off.

## 3.2.4 hosting patch 13 (2026-09-28) Optional run end

- **Settings > Display > Out of moves: Reshuffle or End run.** Reshuffle is the default and works exactly as before. With End run on, running out of moves dims the board and shows an OUT OF MOVES card: your score counts up, the stage you reached, NEW BEST! with fireworks, and a Play again button. It only applies when no partner is connected, so it never ends a shared board.

## 3.2.4 hosting patch 12 (2026-09-28) Clears land on the beat

- Match, special and chord sounds now wait for the next 1/32 note of the soundtrack (never more than about 90 ms), so your clears play in time with the music. Swaps, clicks and the reject buzz stay instant. Measured: 23 of 23 result sounds on the grid, up from 0.

## 3.2.4 hosting patch 11 (2026-09-28) Resonance

- **A shared meter, Tetris Effect Zone style.** Every gem you clear charges it; in co-op both players' clears count, and the bar shows your share and your partner's in your colours.
- **When it fills: RESONANCE** (TEAM RESONANCE if you both pitched in). Eight seconds of concert: lasers, maximum flow, golden light around the screen, light racing the frame, every clear rings a climbing chord and the whole soundtrack plays. It ends with a payout: how many gems you cleared, fireworks and a crown fountain.

## 3.2.4 hosting patch 10 (2026-09-28) Flashes setting

- **Settings > Display > Flashes: Full, Low or Off.** Full is the default and nothing changes for it. Low and Off calm the x5 strobe, the sky and rim flash, the bloom swell and the glow on every match, and dim the lasers. Callouts, speed lines, particles and music stay. Measured over the same combo: Full has 5 hard flashes, Low 3 softer ones, Off none.

## 3.2.4 hosting patch 9 (2026-09-28) Gamepad support

- **Plug in a controller and play** (Discord: "add gamepad support"). The D-pad or left stick moves a cursor, with key repeat. Tap A to select (or to swap with the selected neighbour), or hold A and push a direction to swap that way. B deselects, X shows a hint and Y points a gem out to your co-op partners. Start opens Settings and Back/Select opens the Co-op Room.
- **A bold, pulsing gold cursor** whenever a pad or the arrow keys are driving. It turns aqua with swap arrows while A is held.
- **Rumble** that scales with your combo: bigger chains and specials hit harder, an illegal swap buzzes, and a new stage gives a long rumble.
- Less drag fatigue: the whole game plays from the pad or the keyboard now.

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
