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

## Handoff (2026-09-30 / 3.3.4)

Trent selected **Silver / arcade lift** at its original pitch, asked for the remaining lines, an easy voice disable control, and explicitly authorized shipping the browser game. This supersedes the earlier requests to wait for playtesting and voice selection. The platform is **browser on tront.xyz only**, with commercial release quality; no Steam release, Windows packaging or MIDI. Publish after the final browser gates, then verify the live site.

The nineteen-line Silver pack is generated with the exact retained synthetic reference and the chosen seed 42 / arcade delivery directions. The three approved audition WAVs are tracked in `tools/voice-references/silver-approved-*.wav`; finished Silver clips have no final pitch, EQ, reverb or doubling effects. New generation receives silence trimming, loudness matching and MP3 encoding. The speaker reference and transcript are in `silver-reference.wav` and its JSON. Base instruction embeddings use the same experimental local path as the approved take. Three original Bejeweled 2 snippets exist only in the ignored audition folder, never as cloning inputs or product assets.

`tools/announcer-pack.json` version 2 has Silver as default plus the six legacy profiles (133 clips). Audio has an **Announcer voice** switch visible without scrolling on desktop and phone. Turning it off cancels active and queued speech, keeps music and gem sounds, and saves the choice. The one-time pack migration selects Silver while preserving off/volume; later voice choices persist. Audio > Announcer voices still has previews, independent voice volume and the earlier voice/pitch options. Calm, Practice and Showcase stay quiet.

Final local browser gates: gameplay 22/22; progression/private co-op 48/48; isolated public/spectator/migration 15/15; desktop/phone/WebGPU/WebGL/controller/photo 68/68; stage fades 16/16; audio-clock journey 30/30; harmony/comfort/private co-op 121/121; aligned highlights 21/21; announcer 161/161. Exact compressed speech checks pass 133/133. Firefox 157 / WebGL 2 verifies Silver playback, voice disable and aligned highlights with no errors. Announcer receipts are in `tools/out/announcer/`; the final gate also exercises real pointer disabling, pack migration and voice-off reload persistence. Release asset audit: `tools/out/release/silver-3.3.4.json` (24/24).

Patch 25 fixes Trent's highlight feedback: keep move preview, trace actual rendered gem silhouettes with the actor transform, fit one depth-tested focus bracket to the physical socket, and pulse the existing frame inlay instead of detached HUD bands. Receipts: `tools/out/highlights/`. Patch 26 adds the selected Silver pack and the main Audio switch. Original `versions/gemstogether-v3.2.4.html` remains unchanged.

Start with `CHANGELOG.md`, `ROADMAP.md` and `ART-BIBLE.md` for the accumulated feature work. Historical voice casting and feedback are in `tools/VOICE-AUDITIONS.md`; the exact production listening page is `tools/out/announcer/index.html`. The selected audition remains at `tools/out/voices/silver-round6/index.html`. Receipts page: `python tools/gauntlet-report.py` -> `tools/out/gauntlet/index.html`; earlier rounds are logged in `tools/gauntlet.json`.

Direction, never break these:
- MORE juice, never less. Fix a weak or wrong effect by changing its shape, colour or timing; comfort lives in options (the Flashes setting).
- The live site boots into the PUBLIC co-op room. Test the co-op path (host AND peer), not only `#solo=1`. Presentation-only effects must not change phase or send packets.
- Ground every light to real geometry. The cyan rail inlay is centered at +-4.07, z .107 with .14 mesh depth; socket brackets sit at local +- .392, z .077. Corner gems are (+-4.10, +-4.10) at z .30 top / .40 bottom, crown [0, 4.98, .05], plinth front z .32. Project actual mesh vertices and transforms for gem outlines.
- Intensity in the music comes from layering (latched), never from tempo; one steady 88 BPM.

Patch code lives in `tools/polish.py` (rep() pairs, patches 1-26), `tools/resonance.js` (FX, stages, Resonance, the combo ladder), `tools/music.js` (ResonanceMusic), `tools/expedition.js` (3.3 progression, challenges, comfort, photos, social moments and stage transitions) and `tools/announcer.js` (local voice presentation). Rebuild: `python tools/polish.py`; the exact 3.2.4 drop remains untouched. Browser version is 3.3.4. The Qwen pack is `tools/announcer-pack.json`; retained synthetic references are in `tools/voice-references/`. See `tools/ANNOUNCER.md` for generation, filenames and the listening page.

Patch 23 aligns stage entrances and progression changes on the local soundtrack bar and adds three phases per stage. `fx.stage` remains score-derived for shared Resonance capacity; `fx.visualStage`, `visualPhase` and `stageTravel` are local presentation. Never delay the board or sync these local clocks. A loaded track or muted music uses an immediate fade. `__jewel.fx()` exposes entrance timestamps for verification.

Patch 24 finishes distinct harmonies for all six stages. `music.key(at)` follows the harmony audible at a scheduled time, including pending travel; it is relative to the existing shared Gem tones key. Only pitched buffers transpose. Pads fade at a key change; new boards reset the local music scheduler and earned layers. Music routes through `audio.resonanceFilter`, then the announcer's ducker, then the compressor. Voice and SFX bypass that filter. `comboTreatment` is a local preference, true unless explicitly false; Low's large-flash interval is shared across match, Resonance and combo effects. The listening comparison is `tools/out/harmony/index.html`.

Test and receipts tools:
- `tools/verify.mjs` (22 checks, also the live URL)
- `tools/expedition-audit.mjs` (48 progression/challenge/photo/private co-op checks)
- `tools/expedition-network.mjs` (15 team, spectator and host migration checks; random isolated public room)
- `tools/expedition-visual.mjs` (68 desktop/phone, WebGPU/WebGL, controller, keyboard and PNG checks)
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
