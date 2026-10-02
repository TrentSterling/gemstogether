# CLAUDE.md, Gems Together

Co-op match-three (one HTML file, own GPU renderer: WebGPU with WebGL2 fallback, Trystero/WebRTC co-op). Live at https://tront.xyz/gemstogether/ (public repo `TrentSterling/gemstogether`, Pages from `main` root, https enforced). ChatGPT writes the drops; this repo hosts them. Built by Tront for Jennifer.

## Pipeline

1. New drop -> `versions/gemstogether-vX.Y.Z.html` (exact bytes). ChatGPT's handoff chat goes in git-ignored `ref/`.
2. `python tools/polish.py versions/gemstogether-vX.Y.Z.html` writes `index.html` (meta, em dash fix, About block). Every replacement must match exactly once or it aborts; update the anchors when ChatGPT changes them.
3. `node tools/verify.mjs` (22 checks). Look at `tools/out/qa-*.png`.
4. OG only if the look changed: `H=1000 SHOTS=10 EVERY=500 node tools/og-shot.mjs`, crop a 1200x630 band from y=30 of the best frame (combo panel + sparkle), save as `og-image.png`, bump `OGV` in polish.py and `?v=` on the games card.
5. CHANGELOG, commit, push, `node tools/verify.mjs https://tront.xyz/gemstogether/`.

## Rules

- Harnesses load `#solo=1` so they never join the real public room (people may be playing).
- No em dashes in player-facing text. Discord links are `tront.xyz/discord/`.
- The game is Gems Together, everywhere. polish.py renames the drop's leftover internal `jewelbound-*` save keys and co-op appId to `gemstogether-*`; if a drop still carries them, keep that rename (the count anchor will tell you).

## Hooks

`window.__jewel`: `ready`, `diagnostics()`, `state()` (cells, score, moves, legalMoves, errors), `ui()` (GPU hit boxes in CSS px), `project(i)` (cell to screen), `swap(x,y)`, `hint()`, `showcase()`/`stop()`, `fixture(name)`, `burst()`, `advance(s)`, `resume()`, `stats()`, `net()`, `point(i)` (same path as a right click on a gem), `points()` ({local:{i,seq,age}|null, remote:[{peer,i,seq,age}]}), `audio`, `living()`, `presentation()`, `aa()`, `point(i)`, `points()` (local + remote point pings). `fx()` (Resonance FX state: flow, pulse, swirl, field, fireworks). Tront patches (point ping, input fixes, renames, Resonance FX) live as rep() pairs in `tools/polish.py`; Resonance's class and shader snippets live in `tools/resonance.js` and are injected before `SKY_GL_FS`. Look-check FX with `node tools/fx-shot.mjs` (FORCE=1 fires a synthetic x6 payoff, WEBGL=1 forces the fallback) and `node tools/fx-iso.mjs`; when ChatGPT ships a drop that already has one, drop that section.

## Handoff (2026-09-30 / 3.3.5)

Trent selected **Original 07 / Tuned stereo crystal**, displayed as row 03 in
round ten. This supersedes the earlier unprocessed Silver and later mix trials.
The browser release uses the exact selected MP3 bytes for all nineteen lines.
The platform is **browser on tront.xyz only**, with commercial release quality;
no Steam release, Windows packaging or MIDI. Publishing was already authorized.

Selected audio is frozen in `tools/voice-references/silver-crystal/` with a
manifest recording checksums, the audition identity, original performance
hashes and the processing recipe. `tools/announcer-crystal.py` installs it;
`tools/announcer-pack.py` now uses that installer by default. No new synthesis,
pitch rendering or MP3 encoding occurs during a normal rebuild. The earlier
unprocessed WAVs and generation receipts remain in the ignored announcer output.
`announcer-pack.py --natural` explicitly rebuilds the earlier natural pack.

Pack version 3 retains the `silver` ID, now named **Silver crystal**, and all
six legacy profiles unchanged (133 clips). All nineteen selected calls retain
stereo layers. Settings display **Tuned stereo**. The main Audio tab still has
a visible, saved **Announcer voice** switch; switching it off cancels active
and queued speech while keeping music and gem sounds. Pack migration preserves
voice-off and volume preferences. Later voice choices persist normally.

Current release gates: gameplay 22/22; actual WebAudio, selected-byte equality,
stereo, settings and private host/peer co-op 163/163; Firefox 157 / WebGL 2
verifies selected stereo playback, voice disable and aligned highlights.
Compressed speech receipts identify each MP3 hash; glossary-free fallback
retains the first transcript when the Dawn stage hint biases the word done.
`tools/crystal-release-audit.py` gates exact selected audio, compressed levels,
current speech/runtime receipts and the browser version. Release receipts are
in `tools/out/release/`; audio checks are in `tools/out/announcer/`.

Patch 25 fixes aligned gem contours, socket brackets and frame inlays. Patch
26 adds Silver and the main Audio switch. Patch 27 selects the tuned stereo
voice and updates its settings labels. The exact original
`versions/gemstogether-v3.2.4.html` remains unchanged. Earlier progression,
harmony, stage and network checks are historical receipts from 3.3.4; this
patch changes voice assets and labels, not gameplay or stage timing.

See `CHANGELOG.md`, `ROADMAP.md` and `ART-BIBLE.md` for the feature work, and
`tools/VOICE-AUDITIONS.md` for casting and processing history. The selected
review remains `tools/out/voices/blends-round10/index.html`; production clips
are at `tools/out/announcer/index.html`. The original Bejeweled snippets stay
in ignored audition folders, never as synthesis input or shipped audio.

Direction, never break these:
- MORE juice, never less. Fix a weak or wrong effect by changing its shape, colour or timing; comfort lives in options (the Flashes setting).
- The live site boots into the PUBLIC co-op room. Test the co-op path (host AND peer), not only `#solo=1`. Presentation-only effects must not change phase or send packets.
- Ground every light to real geometry. The cyan rail inlay is centered at +-4.07, z .107 with .14 mesh depth; socket brackets sit at local +- .392, z .077. Corner gems are (+-4.10, +-4.10) at z .30 top / .40 bottom, crown [0, 4.98, .05], plinth front z .32. Project actual mesh vertices and transforms for gem outlines.
- Intensity in the music comes from layering (latched), never from tempo; one steady 88 BPM.

Patch code lives in `tools/polish.py` (rep() pairs, patches 1-28), `tools/resonance.js` (FX, stages, Resonance, the combo ladder), `tools/music.js` (ResonanceMusic), `tools/expedition.js` (3.3 progression, challenges, comfort, photos, social moments and stage transitions) and `tools/announcer.js` (local voice presentation). Rebuild: `python tools/polish.py`; the exact 3.2.4 drop remains untouched. Browser version is 3.3.6. Patch 28 adds direct board access to Play, input-specific panel hints and mobile touch/rotation coverage. The Qwen pack is `tools/announcer-pack.json`; retained synthetic references are in `tools/voice-references/`. See `tools/ANNOUNCER.md` for generation, filenames and the listening page.

Patch 23 aligns stage entrances and progression changes on the local soundtrack bar and adds three phases per stage. `fx.stage` remains score-derived for shared Resonance capacity; `fx.visualStage`, `visualPhase` and `stageTravel` are local presentation. Never delay the board or sync these local clocks. A loaded track or muted music uses an immediate fade. `__jewel.fx()` exposes entrance timestamps for verification.

Patch 24 finishes distinct harmonies for all six stages. `music.key(at)` follows the harmony audible at a scheduled time, including pending travel; it is relative to the existing shared Gem tones key. Only pitched buffers transpose. Pads fade at a key change; new boards reset the local music scheduler and earned layers. Music routes through `audio.resonanceFilter`, then the announcer's ducker, then the compressor. Voice and SFX bypass that filter. `comboTreatment` is a local preference, true unless explicitly false; Low's large-flash interval is shared across match, Resonance and combo effects. The listening comparison is `tools/out/harmony/index.html`.

Test and receipts tools:
Run the timing-sensitive audio gates without concurrent GPU/audio harnesses. Competing workloads can interrupt the real clock and invalidate a downbeat timing measurement.
- `tools/verify.mjs` (22 checks, also the live URL)
- `tools/expedition-audit.mjs` (48 progression/challenge/photo/private co-op checks)
- `tools/expedition-network.mjs` (15 team, spectator and host migration checks; random isolated public room)
- `tools/expedition-visual.mjs` (112 desktop/mobile, WebGPU/WebGL, real browser touch events at 2x density, scrolling, rotation, compact HUD/overlay bounds, controller, keyboard and PNG checks; physical devices remain manual)
- `tools/expedition-stage.mjs` (16 checks for both backend fades, input during travel, reduced motion and Starfall shooting stars)
- `tools/journey-audit.mjs` (30 real audio-clock/phase checks on both backends, plus private co-op with different local clocks)
- `tools/harmony-audit.mjs` (121 actual tone, spectrum, comfort, offline audio and private co-op checks); `tools/harmony-listen.mjs` renders the before/after listening page
- The harmony gate tests all 48 selectable stage/key combinations on both backends and loads an actual WAV through `audio.loadTrack`. It measures the live filtered bus; analyser smoothing is disabled for these spectrum comparisons.
- `tools/announcer-audit.mjs` (136 real WebAudio/GPU/private co-op checks) and `tools/announcer-check.py` (114 compressed speech-content checks)
- `tools/coop-point.mjs` and `tools/coop-res.mjs` (two browsers, private room)
- `tools/swap-audit.mjs` (illegal swap: solo, host, peer)
- `tools/clip.mjs <file|url> <label> <scene> <secs>` (scenes: cascade, swap, stage, tour, res, pad, end, end1, showcase; env W, H, WEBGL, FLASH)
- `tools/music-render.mjs`, `tools/music-latch.mjs` and `tools/beat-audit.mjs` (audio)
- `tools/align-audit.mjs` + `tools/align-sheet.py` (perspective alignment at 3 sizes)
- `tools/highlight-audit.mjs` (21 real mesh-contour, socket, frame, keyboard and GPU checks) and `tools/firefox-highlight.mjs` (isolated Firefox profile, preview/frame screenshots)

`desktop/` and native packaging receipts are leftovers from an unwanted scope expansion. They are outside the current project direction; do not launch, test, package or publish them. Their HTML/hash receipts describe the pre-playtest patch 24 build and are historical only. Local web changes are tested in Chrome and Firefox.

Progression key: `gemstogether-expedition-v1`. Comfort settings are local; timers, move budgets, seeds and scoring are host-authoritative. Snapshot/heartbeat challenge state, Resonance and contribution identity survive host migration. `__jewel.expedition()`, `challenge(mode, options)` and `cheer()` expose the new harness hooks.

Gotchas: Showcase and the lab fixtures run in practice mode (no stages, Resonance or milestones), so use the `res` scene for real play. Write patch scripts with the Write tool (bash heredocs break on apostrophes). After every push, wait for Pages, then run verify against https://tront.xyz/gemstogether/.
