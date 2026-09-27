# Changelog

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
