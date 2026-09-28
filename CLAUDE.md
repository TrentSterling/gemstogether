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

## Handoff (2026-09-28, after patch 20)

Start here next session: `ROADMAP.md` (section 0 = Andre's feedback table, the north star; then "Next up"), `ART-BIBLE.md` (the rules), `CHANGELOG.md` (patches 1-20). Receipts page: `python tools/gauntlet-report.py` -> `tools/out/gauntlet/index.html` (open in Firefox); rounds are logged in `tools/gauntlet.json`.

Direction, never break these:
- MORE juice, never less. Fix a weak or wrong effect by changing its shape, colour or timing; comfort lives in options (the Flashes setting).
- The live site boots into the PUBLIC co-op room. Test the co-op path (host AND peer), not only `#solo=1`. Presentation-only effects must not change phase or send packets.
- Ground every light to real geometry (rails +-4.08, outer rim 4.22, corner orbs (+-4.10, +-4.10) at z .30 top / .40 bottom, crown [0, 4.98, .05], plinth front z .32). 2D overlays that frame 3D things project real world points.
- Intensity in the music comes from layering (latched), never from tempo; one steady 88 BPM.

Patch code lives in `tools/polish.py` (rep() pairs, patches 1-20 in order), `tools/resonance.js` (FX, stages, Resonance, the combo ladder) and `tools/music.js` (ResonanceMusic). Rebuild: `python tools/polish.py`.

Test and receipts tools:
- `tools/verify.mjs` (22 checks, also the live URL)
- `tools/coop-point.mjs` and `tools/coop-res.mjs` (two browsers, private room)
- `tools/swap-audit.mjs` (illegal swap: solo, host, peer)
- `tools/clip.mjs <file|url> <label> <scene> <secs>` (scenes: cascade, swap, stage, tour, res, pad, end, end1, showcase; env W, H, WEBGL, FLASH)
- `tools/music-render.mjs`, `tools/music-latch.mjs` and `tools/beat-audit.mjs` (audio)
- `tools/align-audit.mjs` + `tools/align-sheet.py` (perspective alignment at 3 sizes)

Gotchas: Showcase and the lab fixtures run in practice mode (no stages, Resonance or milestones), so use the `res` scene for real play. Write patch scripts with the Write tool (bash heredocs break on apostrophes). After every push, wait for Pages, then run verify against https://tront.xyz/gemstogether/.
