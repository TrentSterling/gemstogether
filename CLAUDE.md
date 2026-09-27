# CLAUDE.md, Gems Together

Co-op match-three (one HTML file, own GPU renderer: WebGPU with WebGL2 fallback, Trystero/WebRTC co-op). Live at https://tront.xyz/gemstogether/ (public repo `TrentSterling/gemstogether`, Pages from `main` root, https enforced). ChatGPT writes the drops; this repo hosts them. Built by Tront for Jennifer.

## Pipeline

1. New drop -> `versions/gemstogether-vX.Y.Z.html` (exact bytes). ChatGPT's handoff chat goes in git-ignored `ref/`.
2. `python tools/polish.py versions/gemstogether-vX.Y.Z.html` writes `index.html` (meta, em dash fix, About block). Every replacement must match exactly once or it aborts; update the anchors when ChatGPT changes them.
3. `node tools/verify.mjs` (19 checks). Look at `tools/out/qa-*.png`.
4. OG only if the look changed: `H=1000 SHOTS=10 EVERY=500 node tools/og-shot.mjs`, crop a 1200x630 band from y=30 of the best frame (combo panel + sparkle), save as `og-image.png`, bump `OGV` in polish.py and `?v=` on the games card.
5. CHANGELOG, commit, push, `node tools/verify.mjs https://tront.xyz/gemstogether/`.

## Rules

- Harnesses load `#solo=1` so they never join the real public room (people may be playing).
- No em dashes in player-facing text. Discord links are `tront.xyz/discord/`.
- The game is Gems Together, everywhere. polish.py renames the drop's leftover internal `jewelbound-*` save keys and co-op appId to `gemstogether-*`; if a drop still carries them, keep that rename (the count anchor will tell you).

## Hooks

`window.__jewel`: `ready`, `diagnostics()`, `state()` (cells, score, moves, legalMoves, errors), `ui()` (GPU hit boxes in CSS px), `project(i)` (cell to screen), `swap(x,y)`, `hint()`, `showcase()`/`stop()`, `fixture(name)`, `burst()`, `advance(s)`, `resume()`, `stats()`, `net()`, `audio`, `living()`, `presentation()`, `aa()`.
